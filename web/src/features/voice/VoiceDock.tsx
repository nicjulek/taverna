import type { RtcPeer } from '@taverna/shared'
import { Mic, MicOff, PhoneOff, Video, VideoOff, Headphones } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Token } from '@/components/ui'
import { cn } from '@/lib/cn'
import { getSocket } from '@/lib/realtime'
import { useVoice } from './useVoice'

function Tile({
  stream,
  name,
  label = name,
  color,
  muted,
  video
}: {
  stream: MediaStream | null
  name: string
  label?: string
  color: string
  muted?: boolean
  video: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream
  }, [stream])
  return (
    <figure className="relative aspect-[4/3] w-36 overflow-hidden rounded-control border border-line bg-felt-deep">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn('size-full object-cover', !video && 'hidden')} />
      {!video && (
        <div className="grid size-full place-items-center">
          <Token name={name} color={color} decorative />
        </div>
      )}
      <figcaption className="absolute inset-x-0 bottom-0 truncate bg-felt-deep/80 px-2 py-0.5 text-xs">{label}</figcaption>
    </figure>
  )
}

export function VoiceDock({ campaignId, me }: { campaignId: string; me: { displayName: string; color: string } }) {
  const voice = useVoice(campaignId)
  const [open, setOpen] = useState(false)
  const socketId = getSocket().id
  const others = voice.peers.filter((p: RtcPeer) => p.socketId !== socketId)

  if (!voice.joined) {
    return (
      <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2">
        {open && (
          <div
            className="flex flex-col gap-2 rounded-panel border border-line-strong bg-surface/95 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.8)]"
            role="group"
            aria-label="Entrar na conversa"
          >
            <p className="max-w-56 text-sm text-moss">Fale com a mesa pelo navegador. Ninguém ouve antes de você entrar.</p>
            <Button size="sm" loading={voice.joining} onClick={() => void voice.join(false)}>
              <Mic /> Entrar com voz
            </Button>
            <Button size="sm" variant="secondary" loading={voice.joining} onClick={() => void voice.join(true)}>
              <Video /> Entrar com câmera
            </Button>
            {voice.error && (
              <p role="alert" className="max-w-56 text-sm text-seal-soft">
                {voice.error}
              </p>
            )}
          </div>
        )}
        <Button variant="secondary" className="rounded-full" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Headphones /> Voz e vídeo
        </Button>
      </div>
    )
  }

  return (
    <section
      aria-label="Conversa por voz"
      className="fixed right-4 bottom-4 z-30 flex max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-panel border border-line-strong bg-surface/95 p-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,.8)]"
    >
      <div className="flex max-w-[min(40rem,calc(100vw-3rem))] flex-wrap gap-2">
        <Tile stream={voice.local} name={me.displayName} label={`${me.displayName} (você)`} color={me.color} muted video={voice.cameraOn} />
        {others.map((peer) => (
          <Tile
            key={peer.socketId}
            stream={voice.remote[peer.socketId] ?? null}
            name={peer.displayName}
            color={peer.color}
            video={peer.video}
          />
        ))}
      </div>
      <p className="px-1 text-xs text-moss" role="status">
        {others.length === 0 ? 'Só você na conversa' : `${others.length + 1} na conversa`}
      </p>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant={voice.micOn ? 'secondary' : 'danger'}
          aria-label={voice.micOn ? 'Desligar microfone' : 'Ligar microfone'}
          aria-pressed={!voice.micOn}
          onClick={voice.toggleMic}
        >
          {voice.micOn ? <Mic /> : <MicOff />}
        </Button>
        {voice.hasCamera && (
          <Button
            size="icon"
            variant="secondary"
            aria-label={voice.cameraOn ? 'Desligar câmera' : 'Ligar câmera'}
            aria-pressed={!voice.cameraOn}
            onClick={voice.toggleCamera}
          >
            {voice.cameraOn ? <Video /> : <VideoOff />}
          </Button>
        )}
        <Button size="sm" variant="danger" className="ml-auto" onClick={voice.leave}>
          <PhoneOff /> Sair
        </Button>
      </div>
    </section>
  )
}
