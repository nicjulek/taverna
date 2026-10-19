import { HANDOUT_KIND_LABELS, type HandoutDto } from '@taverna/shared'
import { cn } from '@/lib/cn'

function Paragraphs({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) return null
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  )
}

export function HandoutView({ handout, large = false }: { handout: HandoutDto; large?: boolean }) {
  const image = handout.imageUrl
  switch (handout.kind) {
    case 'letter':
      return (
        <article
          aria-label={`${HANDOUT_KIND_LABELS.letter}: ${handout.title}`}
          className={cn(
            'relative rounded-[0.35rem] border border-[#b8955a] bg-[#efe3c6] text-[#2b1d12] shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)]',
            large ? 'p-8 sm:p-10' : 'p-5'
          )}
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 0%, rgba(255,255,255,.35), transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(120,80,30,.18), transparent 55%)'
          }}
        >
          <h3 className={cn('font-display text-[#2b1d12] italic', large ? 'text-3xl' : 'text-xl')}>{handout.title}</h3>
          <Paragraphs text={handout.body} className={cn('mt-4 font-display leading-relaxed', large ? 'text-xl' : 'text-base')} />
          {image && <img src={image} alt="" className="mt-6 ml-auto h-16 w-16 rounded-full object-cover opacity-90 mix-blend-multiply" />}
        </article>
      )
    case 'riddle':
      return (
        <article
          aria-label={`${HANDOUT_KIND_LABELS.riddle}: ${handout.title}`}
          className={cn('rounded-panel border-2 border-double border-brass/70 bg-felt-deep text-center', large ? 'px-8 py-10' : 'p-5')}
        >
          <h3 className={cn('font-display text-brass-bright', large ? 'text-3xl' : 'text-xl')}>{handout.title}</h3>
          {image && <img src={image} alt="" className="mx-auto mt-4 max-h-56 rounded-control object-contain" />}
          <Paragraphs
            text={handout.body}
            className={cn('mx-auto mt-4 max-w-prose font-display italic', large ? 'text-2xl leading-relaxed' : 'text-lg')}
          />
        </article>
      )
    case 'portrait':
      return (
        <article aria-label={`${HANDOUT_KIND_LABELS.portrait}: ${handout.title}`} className="flex flex-col items-center gap-4 text-center">
          {image ? (
            <img
              src={image}
              alt={`Retrato de ${handout.title}`}
              className={cn(
                'rounded-[50%] border-4 border-[#b8955a] object-cover shadow-[0_0_0_6px_#2b1d12]',
                large ? 'h-80 w-64' : 'h-40 w-32'
              )}
            />
          ) : (
            <div
              className={cn(
                'grid place-items-center rounded-[50%] border-4 border-[#b8955a] bg-surface-raised font-display',
                large ? 'h-80 w-64 text-6xl' : 'h-40 w-32 text-3xl'
              )}
            >
              {handout.title.slice(0, 1)}
            </div>
          )}
          <h3 className={cn('font-display', large ? 'text-3xl' : 'text-xl')}>{handout.title}</h3>
          <Paragraphs text={handout.body} className="max-w-prose text-moss" />
        </article>
      )
    case 'item':
      return (
        <article
          aria-label={`${HANDOUT_KIND_LABELS.item}: ${handout.title}`}
          className="flex flex-col gap-4 rounded-panel border border-line-strong bg-surface p-5 sm:flex-row"
        >
          {image && (
            <img
              src={image}
              alt=""
              className={cn('shrink-0 rounded-control bg-felt-deep object-contain', large ? 'h-64 w-64' : 'h-28 w-28')}
            />
          )}
          <div>
            <p className="text-sm text-brass-bright">Item</p>
            <h3 className={cn('font-display', large ? 'text-3xl' : 'text-xl')}>{handout.title}</h3>
            <Paragraphs text={handout.body} className="mt-2 text-moss" />
          </div>
        </article>
      )
    default:
      return (
        <figure aria-label={handout.title} className="flex flex-col gap-3">
          {image && (
            <img
              src={image}
              alt={handout.title}
              className={cn('w-full rounded-control object-contain', large ? 'max-h-[70dvh]' : 'max-h-56')}
            />
          )}
          <figcaption>
            <span className="font-display text-xl">{handout.title}</span>
            <Paragraphs text={handout.body} className="mt-1 text-moss" />
          </figcaption>
        </figure>
      )
  }
}
