import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { safeRedirect, useSession } from '@/lib/session'
import { FullPageLoader } from './FullPageLoader'

export function RequireAuth() {
  const { data: user, isPending } = useSession()
  const location = useLocation()
  if (isPending) return <FullPageLoader />
  if (!user) return <Navigate to={`/entrar?voltar=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <Outlet />
}

export function GuestOnly() {
  const { data: user, isPending } = useSession()
  const [params] = useSearchParams()
  if (isPending) return <FullPageLoader />
  if (user) return <Navigate to={safeRedirect(params.get('voltar'))} replace />
  return <Outlet />
}
