import { isAudio, jukeboxPosition, type JukeboxDto } from '@taverna/shared'
import { Music, Pause, Play, Repeat, RotateCcw, Upload, Volume2, VolumeX, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogContent } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAssets } from '../table/hooks'
import { AUDIO_ACCEPT, useUploadFiles } from '../table/upload'
import { readLocalVolume, serverNow, useJukebox, useJukeboxControls, useJukeboxFeed, writeLocalVolume } from './hooks'

function useMusic(state: JukeboxDto | undefined, localVolume: number, onBlocked: (blocked: boolean) => void) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const blocked = useRef(onBlocked)
  useEffect(() => {
    blocked.current = onBlocked
  })

  useEffect(() => {
    if (!audio.current) audio.current = new Audio()
    const el = audio.current
    return () => {
      el.pause()
    }
  }, [])

  useEffect(() => {
    const el = audio.current
    if (!el || !state) return
    el.loop = state.loop
    el.volume = Math.min(1, state.volume * localVolume)
    if (!state.url) {
      el.pause()
      el.removeAttribute('src')
      return
    }
    const absolute = new URL(state.url, window.location.origin).href
    if (el.src !== absolute) el.src = absolute
    const sync = () => {
      let target = jukeboxPosition(state, serverNow())
      if (Number.isFinite(el.duration) && el.duration > 0) {
        if (state.loop) target %= el.duration
        else if (target >= el.duration) {
          el.pause()
          return
        }
      }
      if (Math.abs(el.currentTime - target) > 1.2) el.currentTime = target
      if (state.playing && el.paused)
        el.play().then(
          () => blocked.current(false),
          (error: unknown) => blocked.current(error instanceof DOMException && error.name === 'NotAllowedError')
        )
      if (!state.playing && !el.paused) el.pause()
    }
    if (el.readyState >= 1) sync()
    else el.addEventListener('loadedmetadata', sync, { once: true })
    return () => el.removeEventListener('loadedmetadata', sync)
  }, [state, localVolume])

  return audio
}

export function Jukebox({ campaignId, gm }: { campaignId: string; gm: boolean }) {
  const jukebox = useJukebox(campaignId)
  const controls = useJukeboxControls(campaignId)
  const [volume, setVolume] = useState(readLocalVolume)
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [open, setOpen] = useState(false)
  const local = muted ? 0 : volume
  const audio = useMusic(jukebox.data, local, setBlocked)
  useJukeboxFeed(campaignId, (url, level) => {
    if (local === 0) return
    const sound = new Audio(url)
    sound.volume = Math.min(1, level * local)
    void sound.play().catch(() => setBlocked(true))
  })
  const state = jukebox.data
  if (!state || (!gm && !state.url)) return null

  const set = (patch: Partial<JukeboxDto>) => {
    const position = patch.position ?? jukeboxPosition(state, serverNow())
    controls.set.mutate({
      assetId: patch.assetId !== undefined ? patch.assetId : state.assetId,
      playing: patch.playing ?? state.playing,
      position: Math.max(0, Math.min(86_400, position % (audio.current?.duration || Infinity) || 0)),
      loop: patch.loop ?? state.loop,
      volume: patch.volume ?? state.volume
    })
  }

  return (
    <div className="fixed bottom-4 left-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-full border border-line-strong bg-surface/95 py-1 pr-2 pl-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,.8)] backdrop-blur">
      {gm ? (
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpen(true)}>
          <Music /> Trilha
        </Button>
      ) : (
        <Music className="ml-2 size-4 text-brass" aria-hidden />
      )}
      {state.url && (
        <span className="max-w-40 truncate text-sm text-moss" aria-live="polite">
          {state.playing ? state.name : `${state.name} (parada)`}
        </span>
      )}
      {blocked ? (
        <Button
          size="sm"
          className="rounded-full"
          onClick={() =>
            void audio.current?.play().then(
              () => setBlocked(false),
              () => undefined
            )
          }
        >
          Ativar som
        </Button>
      ) : (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-full"
            aria-label={muted ? 'Ligar o som' : 'Silenciar'}
            aria-pressed={muted}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            aria-label="Volume para você"
            onChange={(e) => {
              const value = Number(e.target.value)
              setVolume(value)
              writeLocalVolume(value)
            }}
            className="w-20 accent-[var(--color-brass)] max-sm:hidden"
          />
        </>
      )}
      {gm && (
        <JukeboxPanel
          campaignId={campaignId}
          state={state}
          open={open}
          onOpenChange={setOpen}
          onSet={set}
          onSfx={(id) => controls.sfx.mutate(id)}
        />
      )}
    </div>
  )
}

function JukeboxPanel({
  campaignId,
  state,
  open,
  onOpenChange,
  onSet,
  onSfx
}: {
  campaignId: string
  state: JukeboxDto
  open: boolean
  onOpenChange: (open: boolean) => void
  onSet: (patch: Partial<JukeboxDto>) => void
  onSfx: (assetId: string) => void
}) {
  const assets = useAssets(campaignId)
  const upload = useUploadFiles(campaignId, 'audio')
  const input = useRef<HTMLInputElement>(null)
  const tracks = (assets.data ?? []).filter((a) => isAudio(a.mime))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Trilha sonora"
        description="Toca igual para todo mundo. Cada jogador ajusta o próprio volume."
        className="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-felt-deep p-3">
            <span className="min-w-0 flex-1 truncate">{state.name ?? 'Nada tocando'}</span>
            <Button
              size="icon"
              variant="secondary"
              aria-label={state.playing ? 'Pausar' : 'Tocar'}
              disabled={!state.assetId}
              onClick={() => onSet({ playing: !state.playing })}
            >
              {state.playing ? <Pause /> : <Play />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Voltar ao começo"
              disabled={!state.assetId}
              onClick={() => onSet({ position: 0 })}
            >
              <RotateCcw />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Repetir" aria-pressed={state.loop} onClick={() => onSet({ loop: !state.loop })}>
              <Repeat className={cn(!state.loop && 'opacity-40')} />
            </Button>
            <label className="flex w-full items-center gap-2 text-sm text-moss">
              Volume da mesa
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                defaultValue={state.volume}
                key={state.volume}
                onPointerUp={(e) => onSet({ volume: Number(e.currentTarget.value) })}
                onKeyUp={(e) => onSet({ volume: Number(e.currentTarget.value) })}
                className="flex-1 accent-[var(--color-brass)]"
              />
            </label>
          </div>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto" aria-label="Áudios da campanha">
            {tracks.length === 0 && <li className="text-sm text-moss">Envie músicas e efeitos em MP3, OGG, WAV, FLAC ou M4A.</li>}
            {tracks.map((track) => (
              <li
                key={track.id}
                className={cn('flex items-center gap-2 rounded-control px-2 py-1.5', track.id === state.assetId && 'bg-brass/10')}
              >
                <span className="min-w-0 flex-1 truncate text-sm">{track.name}</span>
                <Button size="sm" variant="ghost" onClick={() => onSet({ assetId: track.id, playing: true, position: 0 })}>
                  <Play /> Tocar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onSfx(track.id)}>
                  <Zap /> Efeito
                </Button>
              </li>
            ))}
          </ul>
          <input
            ref={input}
            type="file"
            accept={AUDIO_ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              await upload.run(files)
            }}
          />
          <Button variant="secondary" className="self-start" onClick={() => input.current?.click()} loading={upload.pending}>
            <Upload /> Enviar áudios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
