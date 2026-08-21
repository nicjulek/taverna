import { expect, type Page, test } from '@playwright/test'
import { newPlayer, signUp } from './helpers'

async function toScreen(page: Page, x: number, y: number) {
  const box = (await page.locator('.konvajs-content').boundingBox())!
  const scale = Math.min(box.width / 2100, box.height / 1400) * 0.96
  return { x: box.x + (box.width - 2100 * scale) / 2 + x * scale, y: box.y + (box.height - 1400 * scale) / 2 + y * scale }
}

async function clickAt(page: Page, x: number, y: number) {
  const p = await toScreen(page, x, y)
  await page.mouse.click(p.x, p.y)
}

test('paredes e porta escondem o que está do outro lado até a porta abrir', async ({ browser }) => {
  const gm = await newPlayer(browser, 'Mestra', { width: 1440, height: 900 })
  await gm.goto('/criar-conta')
  await signUp(gm, 'Mestra')
  await gm.getByRole('button', { name: 'Nova campanha' }).first().click()
  await gm.getByLabel('Nome').fill('Cripta Fria')
  await gm.getByRole('button', { name: 'Criar campanha' }).click()

  await gm.getByRole('link', { name: 'Jogadores' }).click()
  const invite = await gm.locator('[title*="/convite/"]').getAttribute('title')
  const player = await newPlayer(browser, 'Ladina', { width: 1440, height: 900 })
  await player.goto(invite!)
  await signUp(player, 'Ladina')
  await player.getByRole('button', { name: 'Entrar na campanha' }).click()

  await gm.reload()
  await gm.getByRole('link', { name: 'Mesa' }).click()
  await gm.getByRole('button', { name: 'Nova cena' }).click()
  await gm.getByLabel('Nome da cena').fill('Corredor')
  await gm.getByRole('button', { name: 'Criar cena' }).click()
  await expect(gm.getByRole('heading', { name: 'Corredor' })).toBeVisible()
  await gm.getByLabel('Jogadores só veem o que os tokens enxergam').click()
  await expect(gm.getByLabel('Jogadores só veem o que os tokens enxergam')).toBeChecked()
  await gm.getByRole('combobox', { name: 'Luz ambiente' }).click()
  await gm.getByRole('option', { name: 'Dia claro' }).click()

  await gm.getByRole('button', { name: 'Paredes, portas e janelas' }).click()
  await clickAt(gm, 1050, 0)
  await clickAt(gm, 1050, 560)
  await gm.keyboard.press('Enter')
  await clickAt(gm, 1050, 770)
  await clickAt(gm, 1050, 1400)
  await gm.keyboard.press('Enter')
  await gm.getByRole('combobox', { name: 'O que desenhar' }).click()
  await gm.getByRole('option', { name: 'Porta' }).click()
  await clickAt(gm, 1050, 560)
  await clickAt(gm, 1050, 770)

  await gm.getByRole('button', { name: 'Token', exact: true }).click()
  await clickAt(gm, 1750, 665)
  await gm.getByLabel('Nome do token').fill('Espectro')
  await gm.getByRole('button', { name: 'Colocar' }).click()
  await clickAt(gm, 350, 665)
  await gm.getByLabel('Nome do token').fill('Ladina')
  await gm.getByRole('button', { name: 'Colocar' }).click()
  await gm.getByRole('combobox', { name: 'Controlado por' }).click()
  await gm.getByRole('option', { name: 'Ladina' }).click()
  await gm.getByRole('button', { name: 'Selecionar e mover' }).click()
  await gm.keyboard.press('Escape')

  await player.getByRole('link', { name: 'Mesa' }).click()
  await expect(player.getByRole('heading', { name: 'Corredor' })).toBeVisible()
  const tokens = player.getByRole('region', { name: 'Tokens na cena' })
  await expect(tokens.getByRole('button', { name: 'Ladina' })).toBeVisible()
  await expect(tokens.getByRole('button', { name: 'Espectro' })).toHaveCount(0)

  await clickAt(player, 1050, 665)
  await expect(tokens.getByRole('button', { name: 'Espectro' })).toBeVisible()

  await clickAt(gm, 1050, 665)
  await expect(tokens.getByRole('button', { name: 'Espectro' })).toHaveCount(0)
})
