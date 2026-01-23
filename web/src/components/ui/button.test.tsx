import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button', () => {
  it('fica desativado e mostra o carregamento quando loading', () => {
    render(<Button loading>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('dispara o clique', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Criar</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
