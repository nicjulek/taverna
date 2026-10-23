import { expect, test } from '@playwright/test'
import { newPlayer, signUp } from './helpers'

test('mestre cria a campanha, convida um jogador e compartilha só o que quer', async ({ browser }) => {
  const gm = await newPlayer(browser, 'Mestra')
  await gm.goto('/criar-conta')
  await signUp(gm, 'Mestra')
  await expect(gm.getByRole('heading', { name: 'Suas mesas' })).toBeVisible()

  await gm.getByRole('button', { name: 'Nova campanha' }).first().click()
  await gm.getByLabel('Nome').fill('Cripta do Rei Lich')
  await gm.getByRole('button', { name: 'Criar campanha' }).click()
  await expect(gm.getByRole('heading', { name: 'Cripta do Rei Lich' })).toBeVisible()

  await gm.getByRole('complementary', { name: 'Páginas do diário' }).getByRole('button', { name: 'Nova página' }).click()
  await expect(gm.getByLabel('Título')).toHaveValue('Página sem título')
  await gm.getByLabel('Título').fill('Rumores da vila')
  await gm.getByLabel('Conteúdo').fill('O ferreiro viu **luzes** no cemitério.')
  await gm.getByRole('button', { name: 'Salvar página' }).click()
  await expect(gm.getByText('Tudo salvo')).toBeVisible()
  await gm.getByRole('button', { name: 'Quem vê esta página' }).click()
  await gm.getByRole('combobox', { name: 'Acesso de todos os jogadores' }).click()
  await gm.getByRole('option', { name: 'Pode ver' }).click()
  await gm.getByRole('button', { name: 'Salvar permissões' }).click()
  await expect(gm.getByText('Todos podem ler')).toBeVisible()

  await gm.getByRole('complementary', { name: 'Páginas do diário' }).getByRole('button', { name: 'Nova página' }).click()
  await expect(gm.getByLabel('Título')).toHaveValue('Página sem título')
  await gm.getByLabel('Título').fill('O Lich é o prefeito')
  await gm.getByRole('button', { name: 'Salvar página' }).click()
  await expect(gm.getByText('Tudo salvo')).toBeVisible()

  await gm.getByRole('link', { name: 'Jogadores' }).click()
  const invite = await gm.locator('[title*="/convite/"]').getAttribute('title')
  expect(invite).toBeTruthy()

  const player = await newPlayer(browser, 'Bardo', { width: 390, height: 844 })
  await player.goto(invite!)
  await expect(player).toHaveURL(/entrar/)
  await signUp(player, 'Bardo')
  await expect(player.getByText('Mestra te chamou para jogar')).toBeVisible()
  await player.getByRole('button', { name: 'Entrar na campanha' }).click()

  await expect(player.getByRole('link', { name: 'Rumores da vila' })).toBeVisible()
  await expect(player.getByRole('link', { name: 'O Lich é o prefeito' })).toHaveCount(0)
  await player.getByRole('link', { name: 'Rumores da vila' }).click()
  await expect(player.locator('.prose-taverna strong')).toHaveText('luzes')
  await expect(player.getByRole('button', { name: 'Escrever' })).toHaveCount(0)

  await expect(gm.getByText('2 na mesa agora')).toBeVisible()
  await expect(gm.getByText('Bardo', { exact: true })).toBeVisible()

  await gm.getByRole('button', { name: 'Remover Bardo' }).click()
  await gm.getByRole('button', { name: 'Remover da campanha' }).click()
  await expect(player.getByRole('heading', { name: 'Suas mesas' })).toBeVisible()
  await expect(player.getByText('Você não faz mais parte desta campanha.')).toBeVisible()
})

test('convite inválido explica o que fazer', async ({ browser }) => {
  const page = await newPlayer(browser, 'Curiosa')
  await page.goto('/criar-conta')
  await signUp(page, 'Curiosa')
  await page.goto('/convite/codigo-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Este convite não funciona mais' })).toBeVisible()
})
