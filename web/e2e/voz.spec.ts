import { expect, test } from '@playwright/test'
import { signUp } from './helpers'

test.use({
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-features=WebRtcHideLocalIpsWithMdns']
  }
})

test('mestre e jogador se veem pela câmera do navegador', async ({ browser }) => {
  const open = async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'pt-BR',
      permissions: ['microphone', 'camera']
    })
    return context.newPage()
  }
  const gm = await open()
  await gm.goto('/criar-conta')
  await signUp(gm, 'Mestra')
  await gm.getByRole('button', { name: 'Nova campanha' }).first().click()
  await gm.getByLabel('Nome').fill('Conversa ao pé do fogo')
  await gm.getByRole('button', { name: 'Criar campanha' }).click()
  await gm.getByRole('link', { name: 'Jogadores' }).click()
  const invite = await gm.locator('[title*="/convite/"]').getAttribute('title')

  const player = await open()
  await player.goto(invite!)
  await signUp(player, 'Paladina')
  await player.getByRole('button', { name: 'Entrar na campanha' }).click()

  await gm.getByRole('button', { name: 'Voz e vídeo' }).click()
  await gm.getByRole('button', { name: 'Entrar com câmera' }).click()
  await expect(gm.getByText('Só você na conversa')).toBeVisible()
  await player.getByRole('button', { name: 'Voz e vídeo' }).click()
  await player.getByRole('button', { name: 'Entrar com voz' }).click()

  await expect(gm.getByText('2 na conversa')).toBeVisible()
  await expect(player.getByText('2 na conversa')).toBeVisible()
  await expect
    .poll(() => player.evaluate("[...document.querySelectorAll('video')].some((v) => v.videoWidth > 0 && !v.muted)"), { timeout: 15_000 })
    .toBe(true)

  await player.getByRole('button', { name: 'Desligar microfone' }).click()
  await expect(player.getByRole('button', { name: 'Ligar microfone' })).toBeVisible()
  await player.getByRole('button', { name: 'Sair' }).click()
  await expect(gm.getByText('Só você na conversa')).toBeVisible()
})
