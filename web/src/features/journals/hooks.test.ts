import type { JournalSummaryDto } from '@taverna/shared'
import { groupByFolder } from './hooks'

const page = (title: string, folder: string): JournalSummaryDto => ({
  id: title,
  title,
  folder,
  authorId: 'a',
  authorName: 'Ana',
  access: 'edit',
  defaultAccess: 'none',
  updatedAt: '2026-01-01T00:00:00Z'
})

describe('groupByFolder', () => {
  it('põe as páginas soltas primeiro e ordena pastas e títulos', () => {
    const groups = groupByFolder([page('Zumbis', 'Bestiário'), page('Resumo', ''), page('Aranhas', 'Bestiário'), page('Barão', 'NPCs')])
    expect(groups.map((group) => group.folder)).toEqual(['', 'Bestiário', 'NPCs'])
    expect(groups[1]!.pages.map((item) => item.title)).toEqual(['Aranhas', 'Zumbis'])
  })
})
