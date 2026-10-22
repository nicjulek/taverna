import type { RtcPeer, RtcSignal } from '@taverna/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/realtime'

const ICE: RTCIceServer[] = (import.meta.env.VITE_STUN_URLS ?? 'stun:stun.l.google.com:19302')
  .split(',')
  .map((urls: string) => urls.trim())
  .filter(Boolean)
  .map((urls: string) => ({ urls }))

interface Link {
  pc: RTCPeerConnection
  pending: RTCIceCandidateInit[]
}

export interface VoiceState {
  joined: boolean
  joining: boolean
  error: string | null
  peers: RtcPeer[]
  local: MediaStream | null
  remote: Record<string, MediaStream>
  micOn: boolean
  cameraOn: boolean
}

const INITIAL: VoiceState = { joined: false, joining: false, error: null, peers: [], local: null, remote: {}, micOn: true, cameraOn: false }

export function useVoice(campaignId: string) {
  const [state, setState] = useState<VoiceState>(INITIAL)
  const links = useRef(new Map<string, Link>())
  const local = useRef<MediaStream | null>(null)
  const joined = useRef(false)

  const drop = useCallback((id: string) => {
    links.current.get(id)?.pc.close()
    links.current.delete(id)
    setState((s) => {
      if (!(id in s.remote)) return s
      const remote = { ...s.remote }
      delete remote[id]
      return { ...s, remote }
    })
  }, [])

  const link = useCallback(
    (id: string): Link => {
      const existing = links.current.get(id)
      if (existing) return existing
      const socket = getSocket()
      const pc = new RTCPeerConnection({ iceServers: ICE })
      const entry: Link = { pc, pending: [] }
      links.current.set(id, entry)
      local.current?.getTracks().forEach((track) => pc.addTrack(track, local.current!))
      for (const kind of ['audio', 'video'] as const)
        if (!local.current?.getTracks().some((track) => track.kind === kind)) pc.addTransceiver(kind, { direction: 'recvonly' })
      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return
        const { candidate: c, sdpMid, sdpMLineIndex } = candidate.toJSON()
        socket.emit('rtc:signal', {
          campaignId,
          to: id,
          data: { type: 'candidate', candidate: { candidate: c ?? '', sdpMid: sdpMid ?? null, sdpMLineIndex: sdpMLineIndex ?? null } }
        })
      }
      pc.ontrack = ({ streams }) => {
        const stream = streams[0]
        if (stream) setState((s) => ({ ...s, remote: { ...s.remote, [id]: stream } }))
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') drop(id)
      }
      return entry
    },
    [campaignId, drop]
  )

  useEffect(() => {
    const socket = getSocket()
    const onPeers = async ({ campaignId: id, peers }: { campaignId: string; peers: RtcPeer[] }) => {
      if (id !== campaignId || !joined.current) return
      setState((s) => ({ ...s, peers }))
      const ids = new Set(peers.map((p) => p.socketId))
      for (const known of [...links.current.keys()]) if (!ids.has(known)) drop(known)
      for (const peer of peers) {
        if (peer.socketId === socket.id || links.current.has(peer.socketId) || (socket.id ?? '') > peer.socketId) continue
        const { pc } = link(peer.socketId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('rtc:signal', { campaignId, to: peer.socketId, data: { type: 'offer', sdp: offer.sdp ?? '' } })
      }
    }
    const onSignal = async ({ campaignId: id, from, data }: { campaignId: string; from: string; data: RtcSignal }) => {
      if (id !== campaignId || !joined.current) return
      const entry = link(from)
      const { pc } = entry
      if (data.type === 'candidate') {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => undefined)
        else entry.pending.push(data.candidate)
      } else {
        await pc.setRemoteDescription({ type: data.type, sdp: data.sdp })
        for (const candidate of entry.pending.splice(0)) await pc.addIceCandidate(candidate).catch(() => undefined)
        if (data.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('rtc:signal', { campaignId, to: from, data: { type: 'answer', sdp: answer.sdp ?? '' } })
        }
      }
    }
    socket.on('rtc:peers', onPeers)
    socket.on('rtc:signal', onSignal)
    return () => {
      socket.off('rtc:peers', onPeers)
      socket.off('rtc:signal', onSignal)
    }
  }, [campaignId, link, drop])

  const leave = useCallback(() => {
    if (joined.current) getSocket().emit('rtc:leave', { campaignId })
    joined.current = false
    for (const id of [...links.current.keys()]) drop(id)
    local.current?.getTracks().forEach((track) => track.stop())
    local.current = null
    setState(INITIAL)
  }, [campaignId, drop])

  const join = useCallback(
    async (video: boolean) => {
      setState((s) => ({ ...s, joining: true, error: null }))
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { width: 320, height: 240 } : false })
        local.current = stream
        joined.current = true
        setState({ ...INITIAL, joined: true, local: stream, cameraOn: video })
        getSocket().emit('rtc:join', { campaignId, video })
      } catch (error) {
        const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
        setState({
          ...INITIAL,
          error: denied
            ? 'O navegador não deixou usar o microfone. Libere nas permissões do site.'
            : 'Não achei microfone ou câmera neste aparelho.'
        })
      }
    },
    [campaignId]
  )

  const toggleMic = useCallback(() => {
    const tracks = local.current?.getAudioTracks() ?? []
    const on = !tracks.some((t) => t.enabled)
    tracks.forEach((t) => (t.enabled = on))
    setState((s) => ({ ...s, micOn: on }))
  }, [])

  const toggleCamera = useCallback(() => {
    const tracks = local.current?.getVideoTracks() ?? []
    if (tracks.length === 0) return
    const on = !tracks.some((t) => t.enabled)
    tracks.forEach((t) => (t.enabled = on))
    setState((s) => ({ ...s, cameraOn: on }))
  }, [])

  useEffect(() => leave, [leave])

  return { ...state, join, leave, toggleMic, toggleCamera, hasCamera: (state.local?.getVideoTracks().length ?? 0) > 0 }
}
