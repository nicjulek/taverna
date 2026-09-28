import { expect, type Page, test } from '@playwright/test'
import { newPlayer, signUp } from './helpers'

async function clickAt(page: Page, x: number, y: number) {
  const box = (await page.locator('.konvajs-content').boundingBox())!
  const scale = Math.min(box.width / 2100, box.height / 1400) * 0.96
  await page.mouse.click(box.x + (box.width - 2100 * scale) / 2 + x * scale, box.y + (box.height - 1400 * scale) / 2 + y * scale)
}

test('combate: iniciativa, turno, ataque contra a CA e dano aplicado', async ({ browser }) => {
  const gm = await newPlayer(browser, 'Mestra', { width: 1440, height: 900 })
  await gm.goto('/criar-conta')
  await signUp(gm, 'Mestra')
  await gm.getByRole('button', { name: 'Nova campanha' }).first().click()
  await gm.getByLabel('Nome').fill('Ponte Velha')
  await gm.getByRole('button', { name: 'Criar campanha' }).click()
  await gm.getByRole('link', { name: 'Jogadores' }).click()
  const invite = await gm.locator('[title*="/convite/"]').getAttribute('title')
  const player = await newPlayer(browser, 'Ladra', { width: 1440, height: 900 })
  await player.goto(invite!)
  await signUp(player, 'Ladra')
  await player.getByRole('button', { name: 'Entrar na campanha' }).click()

  await gm.reload()
  await gm.getByRole('link', { name: 'Mesa' }).click()
  await gm.getByRole('button', { name: 'Nova cena' }).click()
  await gm.getByLabel('Nome da cena').fill('Ponte')
  await gm.getByRole('button', { name: 'Criar cena' }).click()
  await expect(gm.getByRole('heading', { name: 'Ponte' })).toBeVisible()

  await gm.getByRole('button', { name: 'Token', exact: true }).click()
  await clickAt(gm, 1050, 665)
  await gm.getByLabel('Criatura do compêndio').fill('Goblin')
  await gm
    .getByRole('list', { name: 'Criaturas encontradas' })
    .getByRole('button', { name: /^Goblin/ })
    .click()
  await expect(gm.getByText('Com PV, CA, ataques e defesas do compêndio')).toBeVisible()
  await gm.getByRole('button', { name: 'Colocar' }).click()
  await expect(gm.getByRole('meter', { name: 'Pontos de vida de Goblin' })).toHaveAttribute('aria-valuemax', '7')

  await clickAt(gm, 455, 665)
  await gm.getByRole('dialog').getByLabel('Nome do token').fill('Ladra')
  await gm.getByRole('button', { name: 'Colocar' }).click()
  await gm.getByRole('combobox', { name: 'Controlado por' }).click()
  await gm.getByRole('option', { name: 'Ladra' }).click()
  await gm.getByLabel('PV máximos').fill('9')
  await gm.getByLabel('PV máximos').press('Enter')
  await gm.getByRole('button', { name: 'Selecionar e mover' }).click()

  await gm.getByRole('button', { name: /Começar combate com os 2 tokens/ }).click()
  await gm.getByRole('button', { name: 'Rolar iniciativa das criaturas' }).click()
  await expect(gm.getByLabel('Iniciativa de Goblin')).not.toHaveValue('')

  await player.getByRole('link', { name: 'Mesa' }).click()
  const tracker = player.getByRole('region', { name: 'Combate' })
  await expect(tracker.getByText('Goblin')).toBeVisible()
  await tracker.getByRole('button', { name: 'Rolar minha iniciativa' }).click()
  await expect(player.getByLabel('Iniciativa de Ladra')).not.toHaveValue('')
  await player.getByLabel('Iniciativa de Ladra').fill('40')
  await player.getByLabel('Iniciativa de Ladra').press('Enter')

  await gm.getByRole('button', { name: 'Começar a primeira rodada' }).click()
  await expect(tracker.getByText('Rodada 1')).toBeVisible()
  await expect(tracker.getByRole('button', { name: 'Terminar meu turno' })).toBeVisible()

  const tokens = player.getByRole('region', { name: 'Tokens na cena' })
  await tokens.getByRole('button', { name: 'Mirar em Goblin' }).click()
  await tokens.getByRole('button', { name: 'Ladra', exact: true }).click()
  const attack = player.getByRole('region', { name: 'Atacar' })
  await expect(attack.getByText('Alvo: Goblin')).toBeVisible()
  await attack.getByLabel('Bônus').fill('30')
  await attack.getByLabel('Dano').fill('7')
  for (let i = 0; i < 6; i++) {
    await attack.getByRole('button', { name: 'Ataque livre' }).click()
    const outcome = attack.getByRole('status')
    await expect(outcome).toBeVisible()
    if (await outcome.getByRole('button', { name: /Aplicar 7 de dano em Goblin/ }).isVisible()) break
  }
  await attack.getByRole('button', { name: 'Aplicar 7 de dano em Goblin' }).click()
  await expect(attack.getByRole('button', { name: 'Dano aplicado' })).toBeVisible()
  await expect(gm.getByRole('region', { name: 'Combate' }).getByText('0/7 PV')).toBeVisible()

  await tracker.getByRole('button', { name: 'Terminar meu turno' }).click()
  await expect(tracker.getByText('Vez de Goblin')).toBeVisible()
  await gm.getByRole('button', { name: 'Encerrar combate' }).click()
  await expect(tracker).toHaveCount(0)
})
