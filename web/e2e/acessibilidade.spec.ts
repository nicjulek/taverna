import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { signUp } from './helpers'

async function audit(page: Page, name: string) {
  const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const problems = results.violations.map((violation) => `${name}: ${violation.id} (${violation.nodes.length}) ${violation.help}`)
  expect(problems).toEqual([])
}

test('as telas principais passam no axe (WCAG 2.1 AA)', async ({ page }) => {
  await page.goto('/entrar')
  await page.evaluate('document.fonts.ready')
  await audit(page, 'entrar')

  await page.goto('/criar-conta')
  await audit(page, 'criar conta')
  await signUp(page, 'Auditora')
  await audit(page, 'mesas vazias')

  await page.getByRole('button', { name: 'Nova campanha' }).first().click()
  await audit(page, 'dialogo nova campanha')
  await page.getByLabel('Nome').fill('Teste de contraste')
  await page.getByRole('button', { name: 'Criar campanha' }).click()
  await expect(page.getByRole('heading', { name: 'Prepare a mesa' })).toBeVisible()
  await audit(page, 'primeiros passos')

  await page.getByRole('button', { name: 'Nova página' }).first().click()
  await expect(page.getByLabel('Título')).toHaveValue('Página sem título')
  await audit(page, 'editor')

  await page.getByRole('link', { name: 'Fichas' }).click()
  await expect(page.getByRole('heading', { name: 'Nenhuma ficha ainda' })).toBeVisible()
  await audit(page, 'fichas vazio')
  await page.getByRole('button', { name: 'Nova ficha' }).click()
  await audit(page, 'dialogo nova ficha')
  await page.getByLabel('Nome do personagem').fill('Auditor')
  await page.getByRole('button', { name: 'Criar ficha' }).click()
  await expect(page.getByText('Tudo salvo')).toBeVisible()
  await audit(page, 'ficha')
  for (const tab of ['Magias', 'Recursos', 'Detalhes']) {
    await page.getByRole('tab', { name: tab }).click()
    await audit(page, `ficha ${tab}`)
  }

  await page.getByRole('link', { name: 'Dados' }).click()
  await expect(page.getByRole('heading', { name: 'Nenhum dado rolado ainda' })).toBeVisible()
  await audit(page, 'dados vazio')
  await page.getByRole('button', { name: 'Vantagem', exact: true }).click()
  await page.getByRole('button', { name: 'Rolar', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await audit(page, 'dados com rolagem')

  await page.getByRole('link', { name: 'Jogadores' }).click()
  await expect(page.getByRole('heading', { name: 'Convite' })).toBeVisible()
  await audit(page, 'jogadores')

  await page.getByRole('link', { name: 'Ajustes' }).click()
  await audit(page, 'ajustes')
})

test('dá para chegar ao conteúdo só com o teclado', async ({ page }) => {
  await page.goto('/criar-conta')
  await signUp(page, 'Teclado')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Tenho um convite' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Nova campanha' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nova campanha' }).first()).toBeFocused()
})
