import { Link } from 'react-router'
import { Die } from './Die'

export function Wordmark({ to = '/campanhas' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-control text-bone">
      <Die className="size-7 text-brass" />
      <span className="font-display text-2xl font-bold tracking-tight">Taverna</span>
    </Link>
  )
}
