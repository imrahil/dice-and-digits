import type { Category, GameDef, Text } from '../types'

const cat = (id: string, en: string, pl: string, opts: Omit<Category, 'id' | 'name'> = {}): Category => ({
  id,
  name: { en, pl },
  ...opts,
})

type Preset = Omit<GameDef, 'updatedAt' | 'builtin'>

const name = (en: string, pl: string): Text => (en === pl ? en : { en, pl })

/**
 * Pawn colours of physical games. `family` is the roster colour a pawn
 * resembles, so a player can get "their" colour when it's on offer.
 */
export const PAWN_COLORS: { hex: string; name: Text; family?: string }[] = [
  { hex: '#d7263d', name: name('Red', 'Czerwony'), family: '#e4572e' },
  { hex: '#1f6fd1', name: name('Blue', 'Niebieski'), family: '#2e86de' },
  { hex: '#2a9d5c', name: name('Green', 'Zielony'), family: '#2a9d5c' },
  { hex: '#f5c518', name: name('Yellow', 'Żółty'), family: '#f2b134' },
  { hex: '#2a2a2e', name: name('Black', 'Czarny') },
  { hex: '#f3efe6', name: name('White', 'Biały') },
  { hex: '#f07f22', name: name('Orange', 'Pomarańczowy'), family: '#f07f22' },
  { hex: '#8a5a3c', name: name('Brown', 'Brązowy'), family: '#8a5a3c' },
  { hex: '#8e5bd6', name: name('Purple', 'Fioletowy'), family: '#8e5bd6' },
  { hex: '#e05a9c', name: name('Pink', 'Różowy'), family: '#e05a9c' },
  { hex: '#9aa0a6', name: name('Grey', 'Szary'), family: '#5c6370' },
  { hex: '#1fa5a5', name: name('Teal', 'Morski'), family: '#1fa5a5' },
]

const pawn = (...names: string[]) =>
  names.map((n) => {
    const c = PAWN_COLORS.find((p) => (typeof p.name === 'string' ? p.name : p.name.en) === n)

    if (!c) {
      throw new Error(`Unknown pawn colour ${n}`)
    }

    return c.hex
  })

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
      cat('coins', 'Treasury (coins)', 'Skarbiec (monety)', { div: 3 }),
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
    pawns: pawn('Red', 'Green', 'Blue', 'Yellow', 'Black'),
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
    pawns: pawn('Red', 'Blue', 'Green', 'Yellow', 'Black'),
    lowWins: false,
    categories: [
      cat('routes', 'Routes', 'Trasy'),
      cat('tickets', 'Completed tickets', 'Zrealizowane bilety'),
      cat('failed', 'Failed tickets', 'Niezrealizowane bilety', { negative: true }),
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
    pawns: pawn('Red', 'Blue', 'White', 'Orange', 'Green', 'Brown'),
    lowWins: false,
    target: 10,
    steps: [1, 2],
  },
  {
    id: 'builtin:carcassonne',
    emoji: '🏰',
    name: name('Carcassonne', 'Carcassonne'),
    mode: 'counter',
    pawns: pawn('Red', 'Blue', 'Green', 'Yellow', 'Black', 'Grey'),
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
    id: 'builtin:6nimmt',
    emoji: '🐮',
    name: name('6 nimmt!', '6 bierze'),
    mode: 'rounds',
    lowWins: true,
    target: 66,
  },
  {
    id: 'builtin:lato-z-komarami',
    emoji: '🦟',
    name: name('Lato z komarami (L.L.A.M.A.)', 'Lato z komarami'),
    mode: 'rounds',
    lowWins: true,
    target: 40,
  },
  {
    id: 'builtin:rummikub',
    emoji: '🔢',
    name: name('Rummikub', 'Rummikub'),
    mode: 'rounds',
    lowWins: false,
    zeroSum: true,
  },
  {
    id: 'builtin:ttr-europe',
    emoji: '🚄',
    name: name('Ticket to Ride: Europe', 'Wsiąść do pociągu: Europa'),
    mode: 'sheet',
    pawns: pawn('Red', 'Blue', 'Green', 'Yellow', 'Black'),
    lowWins: false,
    categories: [
      cat('routes', 'Routes', 'Trasy'),
      cat('tickets', 'Completed tickets', 'Zrealizowane bilety'),
      cat('failed', 'Failed tickets', 'Niezrealizowane bilety', { negative: true }),
      cat('stations', 'Unused train stations', 'Niewykorzystane stacje', { per: 4 }),
      cat('express', 'European Express bonus', 'Premia Ekspres Europejski'),
    ],
  },
  {
    id: 'builtin:dream-home',
    emoji: '🏡',
    name: name('Dream Home', 'Domek'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('rooms', 'Rooms', 'Pokoje'),
      cat('decor', 'Decor', 'Dekoracje'),
      cat('roof', 'Roof (with windows)', 'Dach (z oknami)'),
      cat('function', 'Functional home bonuses', 'Premie za funkcjonalność'),
    ],
  },
  {
    id: 'builtin:coffee-rush',
    emoji: '☕',
    name: name('Coffee Rush', 'Szybka kawka'),
    mode: 'sheet',
    lowWins: false,
    categories: [
      cat('orders', 'Fulfilled orders', 'Zrealizowane zamówienia'),
      cat('upgrades', 'Upgrade tiles', 'Kafelki ulepszeń', { per: 2 }),
      cat('bad', 'Bad reviews', 'Złe opinie', { negative: true }),
    ],
  },
  {
    id: 'builtin:zuuupa',
    emoji: '🍲',
    name: name('Zuuupa!', 'Zuuupa!'),
    mode: 'sheet',
    lowWins: false,
    // Enter how many cards of each vegetable you collected; a double card still counts once.
    categories: [
      cat('tomato', 'Tomatoes', 'Pomidory', { per: 3 }),
      cat('cucumber', 'Cucumbers', 'Ogórki', { per: 4 }),
      cat('beet', 'Beetroots', 'Buraki', { per: 5 }),
      cat('pumpkin', 'Pumpkins', 'Dynie', { per: 6 }),
      cat('mushroom', 'Mushrooms', 'Grzyby', { per: 7 }),
    ],
  },
  {
    id: 'builtin:cortex',
    emoji: '🧠',
    name: name('Cortex Challenge', 'Cortex'),
    mode: 'counter',
    lowWins: false,
    target: 4,
    steps: [1],
  },
  {
    id: 'builtin:bug-hotel',
    emoji: '🕸️',
    name: name('Hotel pod Pajęczą Siecią', 'Hotel pod Pajęczą Siecią'),
    mode: 'counter',
    lowWins: false,
    target: 6,
    steps: [1],
  },
  {
    id: 'builtin:killer-shrimp',
    emoji: '🦐',
    name: name('Mordercze krewetki', 'Mordercze krewetki'),
    mode: 'counter',
    lowWins: false,
    target: 10,
    steps: [1, 2, 3, 4],
  },
  {
    id: 'builtin:bohnanza',
    emoji: '🫘',
    name: name('Bohnanza', 'Fasolki'),
    mode: 'counter',
    lowWins: false,
    steps: [1, 2, 3, 4],
  },
  {
    id: 'builtin:capybara',
    emoji: '🍪',
    name: name('Capybara Cookie Club', 'Kapibary herbaciary'),
    mode: 'counter',
    lowWins: false,
    steps: [1, 2, 3, 5],
  },
  {
    id: 'builtin:exploding-kittens',
    emoji: '💣',
    name: name('Exploding Kittens', 'Eksplodujące kotki'),
    mode: 'winner',
    lowWins: false,
  },
  {
    id: 'builtin:hot-potato',
    emoji: '🥔',
    name: name('Hot Potato', 'Gorący ziemniak'),
    mode: 'winner',
    lowWins: true, // records who got burnt; fewest burns wins
    timer: { hidden: true, min: 10, max: 30 },
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
