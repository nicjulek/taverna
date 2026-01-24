import { Die } from '@/components/Die'

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Carregando">
      <Die className="size-10 animate-spin text-brass [animation-duration:1.6s]" />
    </div>
  )
}
