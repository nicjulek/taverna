import { expect, type Browser, type Page } from '@playwright/test'

export async function newPlayer(browser: Browser, name: string, viewport = { width: 1280, height: 800 }): Promise<Page> {
  const context = await browser.newContext({ viewport, locale: 'pt-BR' })
  return context.newPage()
}

export async function signUp(page: Page, name: string): Promise<void> {
  if (!page.url().includes('/criar-conta')) await page.getByRole('link', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome na mesa').fill(name)
  await page.getByLabel('E-mail').fill(`${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@teste.dev`)
  await page.getByLabel('Senha').fill('senha-forte-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('link', { name: 'Taverna' })).toBeVisible()
}
