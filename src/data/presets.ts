import type { Category, GameDef, Text } from '../types'

const cat = (id: string, en: string, pl: string, negative?: boolean): Category =>
  negative ? { id, name: { en, pl }, negative } : { id, name: { en, pl } }

type Preset = Omit<GameDef, 'updatedAt' | 'builtin'>

const name = (en: string, pl: string): Text => (en === pl ? en : { en, pl })

/**
 * Built-in games. Ids are stable ('builtin:…') because finished sessions and
 * stats refer to them — never rename an id, only its labels.
 */
const PRESETS: Preset[] = [
  {
    id: 'builtin:counter',
    emoji: '➕',
    name: name('Simple counter', 'Prosty licznik'),
    mode: 'counter',
    lowWins: false,
    steps: [1, 5, 10],
  },
  {
    id: 'builtin:rounds',
    emoji: '🔁',
    name: name('Rounds', 'Rundy'),
    mode: 'rounds',
    lowWins: false,
  },
  {
    id: 'builtin:yahtzee',
    emoji: '🎲',
    name: name('Yahtzee', 'Yahtzee / Kości'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('ones', 'Ones', 'Jedynki'),
      cat('twos', 'Twos', 'Dwójki'),
      cat('threes', 'Threes', 'Trójki'),
      cat('fours', 'Fours', 'Czwórki'),
      cat('fives', 'Fives', 'Piątki'),
      cat('sixes', 'Sixes', 'Szóstki'),
      cat('3kind', 'Three of a kind', 'Trzy jednakowe'),
      cat('4kind', 'Four of a kind', 'Cztery jednakowe'),
      cat('full', 'Full house', 'Full'),
      cat('small', 'Small straight', 'Mały strit'),
      cat('large', 'Large straight', 'Duży strit'),
      cat('yahtzee', 'Yahtzee', 'Generał (Yahtzee)'),
      cat('chance', 'Chance', 'Szansa'),
      cat('ybonus', 'Yahtzee bonus', 'Premia za generała'),
    ],
    bonus: {
      name: name('Upper section bonus', 'Premia za górną część'),
      of: ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'],
      atLeast: 63,
      points: 35,
    },
  },
  {
    id: 'builtin:7wonders',
    emoji: '🏛️',
    name: name('7 Wonders', '7 Cudów Świata'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('military', 'Military', 'Konflikty militarne'),
      cat('coins', 'Treasury', 'Skarbiec'),
      cat('wonder', 'Wonder', 'Cud'),
      cat('civil', 'Civilian (blue)', 'Budynki cywilne (niebieskie)'),
      cat('science', 'Science (green)', 'Nauka (zielone)'),
      cat('commerce', 'Commercial (yellow)', 'Budynki handlowe (żółte)'),
      cat('guilds', 'Guilds (purple)', 'Gildie (fioletowe)'),
    ],
  },
  {
    id: 'builtin:wingspan',
    emoji: '🐦',
    name: name('Wingspan', 'Na skrzydłach'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('birds', 'Birds', 'Ptaki'),
      cat('bonus', 'Bonus cards', 'Karty bonusowe'),
      cat('goals', 'End-of-round goals', 'Cele rund'),
      cat('eggs', 'Eggs', 'Jaja'),
      cat('food', 'Food on cards', 'Pożywienie na kartach'),
      cat('tucked', 'Tucked cards', 'Wsunięte karty'),
    ],
  },
  {
    id: 'builtin:tm',
    emoji: '🪐',
    name: name('Terraforming Mars', 'Terraformacja Marsa'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('tr', 'Terraform rating', 'Współczynnik terraformacji'),
      cat('milestones', 'Milestones', 'Kamienie milowe'),
      cat('awards', 'Awards', 'Nagrody'),
      cat('greenery', 'Greenery tiles', 'Tereny zielone'),
      cat('cities', 'City tiles', 'Miasta'),
      cat('cards', 'Cards', 'Karty'),
    ],
  },
  {
    id: 'builtin:ttr',
    emoji: '🚂',
    name: name('Ticket to Ride', 'Wsiąść do pociągu'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('routes', 'Routes', 'Trasy'),
      cat('tickets', 'Completed tickets', 'Zrealizowane bilety'),
      cat('failed', 'Failed tickets', 'Niezrealizowane bilety', true),
      cat('longest', 'Longest route bonus', 'Premia za najdłuższą trasę'),
    ],
  },
  {
    id: 'builtin:cascadia',
    emoji: '🌲',
    name: name('Cascadia', 'Cascadia'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('bear', 'Bears', 'Niedźwiedzie'),
      cat('elk', 'Elk', 'Wapiti'),
      cat('salmon', 'Salmon', 'Łososie'),
      cat('hawk', 'Hawks', 'Jastrzębie'),
      cat('fox', 'Foxes', 'Lisy'),
      cat('mountain', 'Mountains', 'Góry'),
      cat('forest', 'Forests', 'Lasy'),
      cat('prairie', 'Prairies', 'Prerie'),
      cat('wetland', 'Wetlands', 'Mokradła'),
      cat('river', 'Rivers', 'Rzeki'),
      cat('habbonus', 'Habitat bonuses', 'Premie za siedliska'),
      cat('nature', 'Nature tokens', 'Żetony natury'),
    ],
  },
  {
    id: 'builtin:catan',
    emoji: '🏝️',
    name: name('Catan', 'Catan'),
    mode: 'counter',
    lowWins: false,
    target: 10,
    steps: [1, 2],
  },
  {
    id: 'builtin:carcassonne',
    emoji: '🏰',
    name: name('Carcassonne', 'Carcassonne'),
    mode: 'counter',
    lowWins: false,
    steps: [1, 2, 3, 4, 5, 10],
  },
  {
    id: 'builtin:splendor',
    emoji: '💎',
    name: name('Splendor', 'Splendor'),
    mode: 'counter',
    lowWins: false,
    target: 15,
    steps: [1, 2, 3, 4, 5],
  },
  {
    id: 'builtin:uno',
    emoji: '🃏',
    name: name('Uno', 'Uno'),
    mode: 'rounds',
    lowWins: false,
    target: 500,
  },
  {
    id: 'builtin:1000',
    emoji: '♠️',
    name: name('Thousand (1000)', 'Tysiąc'),
    mode: 'rounds',
    lowWins: false,
    target: 1000,
  },
  {
    id: 'builtin:scrabble',
    emoji: '🔤',
    name: name('Scrabble', 'Scrabble'),
    mode: 'rounds',
    lowWins: false,
  },
]

export const BUILTIN_GAMES: GameDef[] = PRESETS.map((p) => ({ ...p, builtin: true, updatedAt: 0 }))

export const PLAYER_COLORS = [
  '#e4572e', // red
  '#2e86de', // blue
  '#2a9d5c', // green
  '#f2b134', // yellow
  '#8e5bd6', // purple
  '#f07f22', // orange
  '#e05a9c', // pink
  '#1fa5a5', // teal
  '#8a5a3c', // brown
  '#5c6370', // slate
]

export const GAME_EMOJIS = ['🎲', '🃏', '♟️', '🧩', '🎯', '🏆', '🗺️', '🐉', '🚀', '⚔️', '🌍', '🍀', '👑', '🔮', '🧙', '🏴‍☠️']
