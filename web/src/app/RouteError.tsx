import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button, EmptyState } from '@/components/ui'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : 'Erro desconhecido'
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-4">
      <EmptyState
        title="Algo quebrou nesta tela"
        action={
          <Button asChild>
            <Link to="/campanhas" reloadDocument>
              Voltar para suas mesas
            </Link>
          </Button>
        }
      >
        <p>Recarregar a página costuma resolver. Detalhe técnico: {message}</p>
      </EmptyState>
    </main>
  )
}
