// Library entry for the Claude Design sync: the app's shared components,
// exported as one package. The design agent gets everything here on
// window.DiceAndDigitsUi. Built by `npm run build` in this directory:
// vite.config.ts (bundle, then ds.css -> style.css) and tsconfig.json (.d.ts).

export { Page, Button, IconButton, Card, Section, Avatar, Sheet, Toggle, Segmented, Empty, BottomBar, cx, inputClass } from '../../src/components/ui'
export { Keypad, KeypadDisplay, parseKeypad } from '../../src/components/Keypad'
export { Logo } from '../../src/components/Logo'
export { ModeBadge } from '../../src/components/ModeBadge'
export { SessionRow } from '../../src/components/SessionRow'
export { QrCode, QrShareSheet } from '../../src/components/QrShare'
export { DialogHost, confirm, toast } from '../../src/components/dialogs'
export { CounterBoard } from '../../src/components/play/CounterBoard'
export { RoundsBoard, RoundsTable } from '../../src/components/play/RoundsBoard'
export { SheetBoard, SheetTable } from '../../src/components/play/SheetBoard'
export { WinnerBoard } from '../../src/components/play/WinnerBoard'
export { I18nProvider, useI18n } from '../../src/i18n'
export * as Icons from './icons'
export type { Scorer } from '../../src/lib/scorer'
export type { Category, GameDef, Lang, LogEntry, Player, Rules, ScoringMode, Seat, Session, Skin, Standing, Text, Theme } from '../../src/types'
