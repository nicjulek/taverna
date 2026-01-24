import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@taverna/shared'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { Button, ErrorNote, Field, Input } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { AuthLayout } from './AuthLayout'
import { useAuthMutation } from './useAuthMutation'

export function LoginPage() {
  const [params] = useSearchParams()
  const login = useAuthMutation<LoginInput>('/auth/login')
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const query = params.toString()

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Bom te ver de volta."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to={`/criar-conta${query ? `?${query}` : ''}`} className="text-brass underline-offset-2 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((values) => login.mutate(values))} className="flex flex-col gap-4" noValidate>
        {login.error && <ErrorNote>{login.error instanceof ApiError ? login.error.message : 'Não foi possível entrar.'}</ErrorNote>}
        <Field label="E-mail" error={errors.email?.message}>
          {(props) => <Input type="email" autoComplete="email" autoFocus {...props} {...register('email')} />}
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          {(props) => <Input type="password" autoComplete="current-password" {...props} {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={login.isPending} className="mt-2">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
