import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Wordmark } from '@/components/Wordmark'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger, Token } from '@/components/ui'
import { api } from '@/lib/api'
import { disconnectSocket } from '@/lib/realtime'
import { useSession } from '@/lib/session'
import { ProfileDialog } from './ProfileDialog'

export function AppLayout() {
  const { data: user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      disconnectSocket()
      queryClient.clear()
      void navigate('/entrar', { replace: true })
    }
  })

  if (!user) return null

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-felt/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Dropdown>
            <DropdownTrigger
              className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-sm text-moss hover:text-bone"
              aria-label="Sua conta"
            >
              <span className="hidden sm:inline">{user.displayName}</span>
              <Token name={user.displayName} color={user.color} size="sm" />
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLabel>{user.email}</DropdownLabel>
              <DropdownItem onSelect={() => setProfileOpen(true)}>
                <UserRound /> Seu perfil
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onSelect={() => logout.mutate()}>
                <LogOut /> Sair
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </header>
      <Outlet />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} user={user} />
    </div>
  )
}
