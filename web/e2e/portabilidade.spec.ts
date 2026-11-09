import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { audit, signUp } from './helpers'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAEUlEQVR4nGPQCLDBihgGUgIA4J0hwc2Dia0AAAAASUVORK5CYII=', 'base64')

test('demonstração, galeria, ficha em PDF e campanha levada para outro lugar', async ({ page }) => {
  await page.goto('/criar-conta')
  await signUp(page, 'Viajante')
  await page.getByRole('button', { name: 'Experimentar a demonstração' }).click()
  await expect(page.getByRole('heading', { name: 'As Minas de Pedraluz' })).toBeVisible()

  await page.getByRole('link', { name: 'Galeria' }).click()
  await expect(page.getByRole('button', { name: /Áudios 2/ })).toBeVisible()
  await page.getByRole('combobox', { name: 'Enviar como' }).click()
  await page.getByRole('option', { name: 'Token' }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: 'capitao.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('capitao.png entrou na galeria.')).toBeVisible()
  await page.getByRole('button', { name: /Tokens 1/ }).click()
  await expect(page.getByRole('button', { name: 'Editar capitao.png' })).toBeVisible()
  await audit(page, 'galeria')
  await page.getByRole('button', { name: 'Editar capitao.png' }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Nome' }).fill('Capitão Rubro')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Capitão Rubro')).toBeVisible()

  await page.getByRole('link', { name: 'Fichas', exact: true }).click()
  await page.getByRole('link', { name: /Lia Pés-Leves/ }).click()
  await page.getByRole('button', { name: 'Baixar a ficha' }).click()
  const sheetDownload = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Arquivo da ficha (JSON)' }).click()
  const sheetFile = await (await sheetDownload).path()
  expect(JSON.parse(await readFile(sheetFile, 'utf8'))).toMatchObject({ format: 'taverna.ficha', name: 'Lia Pés-Leves' })

  const sheetUrl = page.url()
  await page.goto(`${sheetUrl}/imprimir`)
  const printed = page.getByRole('article', { name: 'Ficha de Lia Pés-Leves' })
  await expect(printed).toBeVisible()
  await expect(printed.getByText('Furtividade')).toBeVisible()
  await audit(page, 'ficha para imprimir')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeHidden()
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  await page.emulateMedia({ media: 'screen' })

  await page.getByRole('link', { name: 'Voltar para a ficha' }).click()
  await page.getByRole('link', { name: 'Fichas', exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles(sheetFile)
  await expect(page.getByText('Lia Pés-Leves entrou na campanha.')).toBeVisible()
  await page.getByRole('link', { name: 'Fichas', exact: true }).click()
  await expect(page.getByRole('link', { name: /Lia Pés-Leves/ })).toHaveCount(2)

  await page.getByRole('link', { name: 'Ajustes' }).click()
  const campaignDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Exportar campanha' }).click()
  const download = await campaignDownload
  expect(download.suggestedFilename()).toBe('as-minas-de-pedraluz.campanha.json')
  const campaignFile = await download.path()

  await page.getByRole('link', { name: 'Taverna' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'falsa.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"taverna.ficha"}')
  })
  await expect(page.getByText('Esse arquivo é uma ficha')).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles(campaignFile)
  await expect(page.getByText('As Minas de Pedraluz foi importada.')).toBeVisible()
  await page.getByRole('link', { name: 'Fichas', exact: true }).click()
  await expect(page.getByRole('link', { name: /Lia Pés-Leves/ })).toHaveCount(2)
  await page.getByRole('link', { name: 'Taverna' }).click()
  await expect(page.getByRole('link', { name: /As Minas de Pedraluz/ })).toHaveCount(2)
})
