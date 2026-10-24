import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { PLAYER_COLORS } from '../../data/presets'
import { useI18n } from '../../i18n'
import { removePlayer, savePlayer } from '../../lib/store'
import { confirm } from '../dialogs'
import { Avatar, Button, Sheet, cx, inputClass } from '../ui'
import type { Player } from '../../types'

export function PlayerEditor({ player, isNew, onClose }: { player: Player; isNew: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState(player.name)
  const [color, setColor] = useState(player.color)

  const save = () => {
    if (!name.trim()) {
      return
    }

    savePlayer({ ...player, name: name.trim(), color })
    onClose()
  }

  const del = async () => {
    if (!(await confirm(t('deletePlayerConfirm', { name: player.name }), { confirmLabel: t('delete'), danger: true }))) {
      return
    }

    removePlayer(player.id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? t('addPlayer') : t('edit')}>
      <div className="flex items-center gap-3">
        <Avatar name={name || '?'} color={color} size="lg" />
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('playerName')}
          maxLength={30}
          autoFocus={isNew}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </div>
      <p className="mt-4 mb-2 font-semibold">{t('color')}</p>
      <div className="grid grid-cols-5 gap-3">
        {PLAYER_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={c}
            className={cx('flex aspect-square items-center justify-center rounded-full transition active:scale-90', c === color && 'ring-4 ring-ink/25 dark:ring-white/40')}
            style={{ backgroundColor: c }}
          >
            {c === color && <Check className="size-6 text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        {!isNew && (
          <Button variant="danger" size="lg" onClick={del} aria-label={t('delete')}>
            <Trash2 className="size-5" />
          </Button>
        )}
        <Button variant="primary" size="lg" className="flex-1" onClick={save} disabled={!name.trim()}>
          {t('save')}
        </Button>
      </div>
    </Sheet>
  )
}
