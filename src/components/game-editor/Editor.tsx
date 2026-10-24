import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { gameFromEditor, type EditorFields } from '../../lib/games'
import { removeGame, saveGame, setFavorite } from '../../lib/store'
import { goBack, navigate } from '../../hooks/useRoute'
import { confirm } from '../dialogs'
import { FavoriteButton } from '../FavoriteButton'
import { BottomBar, Button, IconButton, Page, Section, inputClass } from '../ui'
import { CategoryList } from './CategoryList'
import { EditorOptions } from './EditorOptions'
import { EmojiPicker } from './EmojiPicker'
import { ModePicker } from './ModePicker'
import type { GameDef } from '../../types'

export function Editor({ initial, isNew, title }: { initial: GameDef; isNew: boolean; title: string }) {
  const { t, text } = useI18n()
  const [g, setG] = useState<GameDef>(initial)
  const [fields, setFields] = useState<EditorFields>(() => ({
    steps: (initial.steps ?? [1, 5, 10]).join(', '),
    target: initial.target ? String(initial.target) : '',
    timerMin: String(initial.timer?.min ?? 10),
    timerMax: String(initial.timer?.max ?? 30),
    playersMin: initial.players ? String(initial.players.min) : '',
    playersMax: initial.players?.max ? String(initial.players.max) : '',
  }))
  const patch = (p: Partial<GameDef>) => setG((x) => ({ ...x, ...p }))
  const setField = (field: keyof EditorFields, value: string) => setFields((f) => ({ ...f, [field]: value }))

  const name = text(g.name).trim()
  const validCats = (g.categories ?? []).filter((c) => text(c.name).trim())
  const valid = name && (g.mode !== 'sheet' || validCats.length > 0)

  const save = () => {
    if (!valid) {
      return
    }

    saveGame(gameFromEditor(g, fields, text))

    // A game you made is one of yours: it goes straight onto My shelf.
    if (isNew) {
      setFavorite(g.id, true)
    }

    goBack('games')
  }

  const del = async () => {
    if (!(await confirm(t('deleteGameDefConfirm', { name }), { confirmLabel: t('delete'), danger: true }))) {
      return
    }

    removeGame(g.id)
    setFavorite(g.id, false)
    navigate('games', { replace: true })
  }

  return (
    <Page
      title={title}
      back="games"
      bare
      actions={
        !isNew && (
          <>
            <FavoriteButton id={g.id} />
            <IconButton label={t('delete')} onClick={del} className="text-danger dark:text-[#ff8a93]">
              <Trash2 className="size-5" />
            </IconButton>
          </>
        )
      }
    >
      <input className={inputClass} placeholder={t('gameName')} value={text(g.name)} onChange={(e) => patch({ name: e.target.value })} maxLength={50} autoFocus={isNew} />

      <Section title={t('icon')}>
        <EmojiPicker value={g.emoji} onChange={(emoji) => patch({ emoji })} />
      </Section>

      <Section title={t('scoringMode')}>
        <ModePicker value={g.mode} onChange={(mode) => patch({ mode })} />
      </Section>

      {g.mode === 'sheet' && (
        <Section title={t('categories')}>
          <CategoryList categories={g.categories ?? []} onChange={(categories) => patch({ categories })} />
        </Section>
      )}

      <Section title={t('options')}>
        <EditorOptions game={g} onPatch={patch} fields={fields} onField={setField} />
      </Section>

      <BottomBar>
        <Button variant="primary" size="lg" className="flex-1" onClick={save} disabled={!valid}>
          {g.mode === 'sheet' && !validCats.length ? t('categoriesNeeded') : t('save')}
        </Button>
      </BottomBar>
    </Page>
  )
}
