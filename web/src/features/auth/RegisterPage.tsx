import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@taverna/shared'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { Button, ErrorNote, Field, Input } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { AuthLayout } from './AuthLayout'
import { useAuthMutation } from './useAuthMutation'

export function RegisterPage() {
  const [params] = useSearchParams()
  const signUp = useAuthMutation<RegisterInput>('/auth/register')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const query = params.toString()

  useEffect(() => {
    if (signUp.error instanceof ApiError) {
      for (const [field, message] of Object.entries(signUp.error.fields)) setError(field as keyof RegisterInput, { message })
    }
  }, [signUp.error, setError])

  const fieldErrors = signUp.error instanceof ApiError && Object.keys(signUp.error.fields).length > 0

  return (
    <AuthLayout
      title="Criar conta"
      subtitle={
        params.get('voltar')?.startsWith('/convite')
          ? 'Crie sua conta para entrar na mesa do seu grupo.'
          : 'Leva um minuto. Depois é só criar ou entrar numa mesa.'
      }
      footer={
        <>
          Já tem conta?{' '}
          <Link to={`/entrar${query ? `?${query}` : ''}`} className="text-brass underline-offset-2 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((values) => signUp.mutate(values))} className="flex flex-col gap-4" noValidate>
        {signUp.error && !fieldErrors && <ErrorNote>{signUp.error.message}</ErrorNote>}
        <Field label="Nome na mesa" hint="É como os outros jogadores vão te ver." error={errors.displayName?.message}>
          {(props) => <Input autoComplete="nickname" autoFocus placeholder="Seu nome ou apelido" {...props} {...register('displayName')} />}
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          {(props) => <Input type="email" autoComplete="email" {...props} {...register('email')} />}
        </Field>
        <Field label="Senha" error={errors.password?.message} hint="Pelo menos 8 caracteres.">
          {(props) => <Input type="password" autoComplete="new-password" {...props} {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={signUp.isPending} className="mt-2">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}
