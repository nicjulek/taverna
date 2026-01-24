import { QueryClientProvider } from '@tanstack/react-query'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/lib/queryClient'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient)
  return (
    <QueryClientProvider client={client}>
      <Tooltip.Provider delayDuration={300}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--color-surface-raised)',
              color: 'var(--color-bone)',
              border: '1px solid var(--color-line)',
              fontFamily: 'var(--font-sans)'
            }
          }}
        />
      </Tooltip.Provider>
    </QueryClientProvider>
  )
}
