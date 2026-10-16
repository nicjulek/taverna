import type { MessageDto, RollDto } from '@taverna/shared'
import { CircleHelp, Lock, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Skeleton, Token } from '@/components/ui'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../campaigns/context'
import { useRoll, useRolls } from '../dice/hooks'
import { RollCard } from '../dice/RollCard'
import { CHAT_HELP, parseChat } from './command'
import { useMessages, useSendMessage } from './hooks'

type Entry = { kind: 'roll'; at: string; roll: RollDto } | { kind: 'message'; at: string; message: MessageDto }

function audienceNote(message: MessageDto, me: string): string | null {
  if (message.audience === 'gm') return 'para os mestres'
  if (message.audience !== 'whisper') return null
  const names = message.recipients.map((r) => (r.userId === me ? 'você' : r.displayName)).join(', ')
  return `cochicho para ${names}`
}

function MessageBubble({ message, me }: { message: MessageDto; me: string }) {
  const note = audienceNote(message, me)
  return (
    <article
      className={cn('flex gap-3 rounded-panel px-3 py-2', note ? 'border border-dashed border-brass/50 bg-brass/5' : 'bg-surface/40')}
    >
      <Token name={message.displayName} color={message.color} decorative />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium text-bone">{message.displayName}</span>
          {note && (
            <span className="inline-flex items-center gap-1 text-brass-bright">
              <Lock className="size-3" aria-hidden /> {note}
            </span>
          )}
          <time dateTime={message.createdAt} className="text-moss-dim">
            {timeAgo(message.createdAt)}
          </time>
        </header>
        <p className="break-words whitespace-pre-wrap">{message.text}</p>
      </div>
    </article>
  )
}

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const { campaign } = useCampaignContext()
  const session = useSession()
  const campaignId = campaign.id
  const members = campaign.memberList
  const me = session.data?.id ?? ''
  const rolls = useRolls(campaignId)
  const messages = useMessages(campaignId)
  const send = useSendMessage(campaignId)
  const roll = useRoll(campaignId)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [help, setHelp] = useState(false)
  const log = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  const entries = useMemo(() => {
    const list: Entry[] = [
      ...(rolls.data?.pages.flat() ?? []).map((r): Entry => ({ kind: 'roll', at: r.createdAt, roll: r })),
      ...(messages.data?.pages.flat() ?? []).map((m): Entry => ({ kind: 'message', at: m.createdAt, message: m }))
    ]
    return list.sort((a, b) => a.at.localeCompare(b.at))
  }, [rolls.data, messages.data])

  useEffect(() => {
    const el = log.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [entries.length])

  const submit = () => {
    const command = parseChat(text, members, me)
    if (command.kind === 'error') return setError(command.message)
    setError(null)
    const done = { onSuccess: () => setText(''), onError: (e: Error) => setError(e.message) }
    if (command.kind === 'roll') roll.mutate(command.roll, done)
    else send.mutate(command.message, done)
  }

  const older = rolls.hasNextPage || messages.hasNextPage
  const pending = rolls.isPending || messages.isPending

  return (
    <section
      aria-label="Chat"
      className={cn('flex min-h-0 flex-col gap-2', compact ? 'h-[min(34rem,70dvh)]' : 'h-[min(48rem,calc(100dvh-14rem))]')}
    >
      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Conversa e rolagens"
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
      >
        {older && (
          <div className="self-center">
            <Button
              size="sm"
              variant="ghost"
              loading={rolls.isFetchingNextPage || messages.isFetchingNextPage}
              onClick={() => {
                stick.current = false
                if (rolls.hasNextPage) void rolls.fetchNextPage()
                if (messages.hasNextPage) void messages.fetchNextPage()
              }}
            >
              Ver mais antigas
            </Button>
          </div>
        )}
        {pending && <Skeleton className="h-32" />}
        {!pending && entries.length === 0 && (
          <div className="m-auto text-center text-sm text-moss">Ninguém falou nada ainda. Diga oi ou role um dado.</div>
        )}
        {entries.map((entry) => (
          <div key={`${entry.kind}-${entry.kind === 'roll' ? entry.roll.id : entry.message.id}`}>
            {entry.kind === 'roll' ? <RollCard roll={entry.roll} compact={compact} /> : <MessageBubble message={entry.message} me={me} />}
          </div>
        ))}
      </div>
      {help && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-control border border-line bg-felt-deep p-3 text-sm">
          {CHAT_HELP.map(([cmd, what]) => (
            <div key={cmd} className="contents">
              <dt className="font-mono text-brass-bright">{cmd}</dt>
              <dd className="text-moss">{what}</dd>
            </div>
          ))}
        </dl>
      )}
      <form
        className="flex items-end gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Comandos do chat"
          aria-expanded={help}
          onClick={() => setHelp((h) => !h)}
        >
          <CircleHelp />
        </Button>
        <label className="sr-only" htmlFor={`chat-${compact ? 'mesa' : 'pagina'}`}>
          Mensagem ou comando
        </label>
        <textarea
          id={`chat-${compact ? 'mesa' : 'pagina'}`}
          rows={1}
          value={text}
          maxLength={1000}
          placeholder="Escreva, ou /r 1d20+5"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `chat-erro-${compact ? 'mesa' : 'pagina'}` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-control border border-line-strong bg-felt-deep px-3 py-2 text-bone placeholder:text-moss-dim focus-visible:border-brass focus-visible:outline-none aria-[invalid=true]:border-seal"
        />
        <Button type="submit" size="icon" aria-label="Enviar" loading={send.isPending || roll.isPending} disabled={!text.trim()}>
          <Send />
        </Button>
      </form>
      {error && (
        <p id={`chat-erro-${compact ? 'mesa' : 'pagina'}`} role="alert" className="text-sm text-seal-soft">
          {error}
        </p>
      )}
    </section>
  )
}
