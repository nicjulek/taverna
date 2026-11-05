export async function readJsonFile(file: File): Promise<unknown> {
  try {
    return JSON.parse(await file.text())
  } catch {
    throw new Error(`${file.name} não é um arquivo JSON válido.`)
  }
}
