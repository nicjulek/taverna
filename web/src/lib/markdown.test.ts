import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('converte títulos, listas e negrito', () => {
    const html = renderMarkdown('# Taverna\n\n- **pão**\n- vinho')
    expect(html).toContain('<h1>Taverna</h1>')
    expect(html).toContain('<strong>pão</strong>')
    expect(html).toContain('<li>vinho</li>')
  })

  it('remove scripts e atributos perigosos', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><script>alert(2)</script>')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
  })
})
