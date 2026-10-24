import { useI18n } from '../i18n'
import { findGame } from '../lib/games'
import { uid } from '../lib/store'
import { Empty, Page } from '../components/ui'
import { BuiltinView } from '../components/game-editor/BuiltinView'
import { Editor } from '../components/game-editor/Editor'
import type { GameDef } from '../types'

const blank = (): GameDef => ({
  id: uid(),
  emoji: '🎲',
  name: '',
  mode: 'sheet',
  lowWins: false,
  categories: [{ id: uid().slice(0, 8), name: '' }],
  steps: [1, 5, 10],
  updatedAt: 0,
})

export function GameEditor({ id }: { id: string }) {
  const { t } = useI18n()
  const existing = id === 'new' ? undefined : findGame(id)

  if (id !== 'new' && (!existing || existing.deleted)) {
    return (
      <Page back="games">
        <Empty icon="🤷" title="404" />
      </Page>
    )
  }

  if (existing?.builtin) {
    return <BuiltinView game={existing} />
  }

  return <Editor key={id} initial={existing ?? blank()} isNew={!existing} title={existing ? t('editGameDef') : t('newGameDef')} />
}
