import { expect, test } from '@playwright/test'
import { newPlayer, signUp } from './helpers'

test('chat com comandos, cochichos, rolagem às cegas e revelações na tela do jogador', async ({ browser }) => {
  const gm = await newPlayer(browser, 'Mestra')
  await gm.goto('/criar-conta')
  await signUp(gm, 'Mestra')
  await gm.getByRole('button', { name: 'Nova campanha' }).first().click()
  await gm.getByLabel('Nome').fill('Torre Partida')
  await gm.getByRole('button', { name: 'Criar campanha' }).click()
  await gm.getByRole('link', { name: 'Jogadores' }).click()
  const invite = await gm.locator('[title*="/convite/"]').getAttribute('title')

  const player = await newPlayer(browser, 'Bardo')
  await player.goto(invite!)
  await signUp(player, 'Bardo')
  await player.getByRole('button', { name: 'Entrar na campanha' }).click()

  const other = await newPlayer(browser, 'Ladina')
  await other.goto(invite!)
  await signUp(other, 'Ladina')
  await other.getByRole('button', { name: 'Entrar na campanha' }).click()

  for (const page of [gm, player, other]) await page.getByRole('link', { name: 'Chat e dados' }).click()
  const box = (page: typeof gm) => page.getByLabel('Mensagem ou comando')

  await box(player).fill('Boa noite, mesa!')
  await box(player).press('Enter')
  await expect(gm.getByText('Boa noite, mesa!')).toBeVisible()
  await expect(other.getByText('Boa noite, mesa!')).toBeVisible()

  await box(gm).fill('/w Bardo A porta está destrancada.')
  await box(gm).press('Enter')
  await expect(player.getByText('A porta está destrancada.')).toBeVisible()
  await expect(player.getByText('cochicho para você')).toBeVisible()
  await other.waitForTimeout(500)
  await expect(other.getByText('A porta está destrancada.')).toHaveCount(0)

  await box(other).fill('/r 1d20+5 # Acrobacia')
  await box(other).press('Enter')
  await expect(gm.getByRole('article', { name: /Ladina, Acrobacia/ })).toBeVisible()
  await expect(player.getByRole('article', { name: /Ladina, Acrobacia/ })).toBeVisible()

  await box(player).fill('/br 1d20 # Intuição')
  await box(player).press('Enter')
  await expect(player.getByText(/às cegas\. Só os mestres sabem o resultado/)).toBeVisible()
  await expect(gm.getByRole('article', { name: /Bardo, Intuição/ })).toBeVisible()
  await other.waitForTimeout(500)
  await expect(other.getByRole('article', { name: /Intuição/ })).toHaveCount(0)

  await box(player).fill('/w Ninguém oi')
  await box(player).press('Enter')
  await expect(player.getByRole('alert')).toBeVisible()

  await gm.getByRole('link', { name: 'Revelações' }).click()
  await gm.getByRole('button', { name: 'Nova revelação' }).first().click()
  const dialog = gm.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Título' }).fill('Carta do arquimago')
  await dialog.getByRole('textbox', { name: 'Texto' }).fill('A torre cai quando a lua some.')
  await dialog.getByRole('button', { name: 'Guardar revelação' }).click()
  await gm.getByRole('button', { name: 'Mostrar a todos' }).click()

  const shown = player.getByRole('dialog', { name: /O mestre mostrou/ })
  await expect(shown).toBeVisible()
  await expect(shown.getByText('A torre cai quando a lua some.')).toBeVisible()
  await shown.getByRole('button', { name: 'Guardar' }).click()
  await player.getByRole('link', { name: 'Revelações' }).click()
  await expect(player.getByRole('heading', { name: 'Carta do arquimago' })).toBeVisible()
})
