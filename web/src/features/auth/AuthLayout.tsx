import type { ReactNode } from 'react'
import { Die } from '@/components/Die'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-felt-deep lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-2">
          <Die className="size-8 text-brass" />
          <span className="font-display text-3xl font-bold">Taverna</span>
        </div>
        <Die className="pointer-events-none absolute -right-24 top-1/2 size-[30rem] -translate-y-1/2 text-brass/[0.07]" />
        <div className="relative max-w-md">
          <p className="font-display text-4xl leading-tight italic">“Vocês se encontram numa taverna…”</p>
          <p className="mt-4 text-lg text-moss">
            A mesa, as fichas e os dados da sua campanha num lugar só, para jogar com seus amigos de onde cada um estiver.
          </p>
        </div>
      </aside>
      <main className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Die className="size-7 text-brass" />
            <span className="font-display text-2xl font-bold">Taverna</span>
          </div>
          <h1 className="text-3xl">{title}</h1>
          <p className="mt-1 mb-8 text-moss">{subtitle}</p>
          {children}
          <div className="mt-8 text-moss">{footer}</div>
        </div>
      </main>
    </div>
  )
}
