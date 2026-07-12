import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ActionButton,
  CardBack,
  Game3DShell,
  MiniCard,
  StatPill,
  ghostButtonStyle,
} from './arcade3d'
import { ACCENT, ACCENT2, BORDER, MUTED, SURFACE2, TEXT } from './theme'
import GameOverModal from './GameOverModal'
import { useGameScore } from './useGameScore'

export type GameProps = { onBack?: () => void }
export type CardSuit = 'S' | 'H' | 'D' | 'C'
export type Card = { id: string; rank: string; suit: CardSuit; value: number; joker?: boolean }
export type Tile = { id: string; color: string; number: number; joker?: boolean }

export const cardSuits: CardSuit[] = ['S', 'H', 'D', 'C']
export const cardRanks = [
  { rank: 'A', value: 1 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
]

export function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function makeDeck(prefix = 'deck') {
  const cards: Card[] = cardSuits.flatMap((suit) => cardRanks.map((card) => ({
    id: `${prefix}-${card.rank}-${suit}`,
    suit,
    rank: card.rank,
    value: card.value,
  })))
  // 2 jokers (value 10 : sert uniquement au score/tri ; la validation joker-aware l'ignore via le flag)
  const jokers: Card[] = [0, 1].map((i) => ({ id: `${prefix}-joker-${i}`, suit: 'S' as CardSuit, rank: '★', value: 10, joker: true }))
  return shuffle([...cards, ...jokers])
}

export function cardPoints(card: Card) {
  return Math.min(card.value, 10)
}

export function drawCards(deck: Card[], count: number) {
  return { hand: deck.slice(0, count), deck: deck.slice(count) }
}

export function gameSide({
  stats,
  message,
  children,
}: {
  stats: { label: string; value: ReactNode; color?: string }[]
  message: string
  children?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {stats.map((stat) => <StatPill key={stat.label} {...stat} />)}
      </div>
      <div style={hintStyle}>{message}</div>
      {children}
    </div>
  )
}

export function Stage({
  children,
  tone,
  floor,
}: {
  children: ReactNode
  tone: 'terrace' | 'felt' | 'court' | 'pool' | 'bamboo' | 'salon' | 'neon'
  floor?: CSSProperties
}) {
  return (
    <div style={{ ...stageStyle, background: stageBackground(tone) }}>
      <div style={distantDecorStyle(tone)} />
      <div style={stageSetPieceStyle(tone, 'left')} />
      <div style={stageSetPieceStyle(tone, 'right')} />
      <div style={{ ...floorStyle, ...floor }} />
      <div style={stageContentStyle}>{children}</div>
    </div>
  )
}

export function stageBackground(tone: Parameters<typeof Stage>[0]['tone']) {
  if (tone === 'court') return 'linear-gradient(180deg, #082f49 0%, #0f172a 45%, #111827 100%)'
  if (tone === 'pool') return 'linear-gradient(180deg, #1f2937 0%, #0f172a 52%, #020617 100%)'
  if (tone === 'bamboo') return 'linear-gradient(180deg, #064e3b 0%, #0f172a 70%)'
  if (tone === 'salon') return 'linear-gradient(180deg, #3b1d1d 0%, #101827 68%)'
  if (tone === 'neon') return 'linear-gradient(180deg, #17113a 0%, #070710 72%)'
  if (tone === 'felt') return 'radial-gradient(circle at 50% 0%, #14532d 0%, #052e16 48%, #020617 100%)'
  return 'linear-gradient(180deg, #0c4a6e 0%, #12361f 56%, #111827 100%)'
}

export function distantDecorStyle(tone: Parameters<typeof Stage>[0]['tone']): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.9,
  }
  if (tone === 'terrace') {
    return {
      ...base,
      background:
        'radial-gradient(circle at 16% 24%, rgba(34,197,94,0.42) 0 42px, transparent 43px), radial-gradient(circle at 23% 28%, rgba(22,163,74,0.36) 0 30px, transparent 31px), linear-gradient(90deg, transparent 0 68%, rgba(148,163,184,0.12) 68% 70%, transparent 70%), linear-gradient(0deg, transparent 0 58%, rgba(255,255,255,0.12) 58% 60%, transparent 60%)',
    }
  }
  if (tone === 'court') {
    return { ...base, background: 'linear-gradient(90deg, transparent 0 14%, rgba(255,255,255,0.08) 14.5% 15%, transparent 15.5% 85%, rgba(255,255,255,0.08) 85.5% 86%, transparent 86.5%), radial-gradient(circle at 50% 18%, rgba(245,158,11,0.2), transparent 18%)' }
  }
  if (tone === 'pool') {
    return { ...base, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px), linear-gradient(180deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px)' }
  }
  if (tone === 'bamboo') {
    return { ...base, background: 'repeating-linear-gradient(90deg, rgba(187,247,208,0.12) 0 5px, transparent 5px 42px), radial-gradient(circle at 18% 20%, rgba(250,204,21,0.2), transparent 18%)' }
  }
  if (tone === 'salon') {
    return { ...base, background: 'radial-gradient(circle at 22% 12%, rgba(245,158,11,0.26), transparent 18%), linear-gradient(90deg, transparent 0 70%, rgba(148,163,184,0.1) 70% 72%, transparent 72%)' }
  }
  if (tone === 'neon') {
    return { ...base, background: 'radial-gradient(circle at 18% 18%, rgba(6,182,212,0.26), transparent 18%), radial-gradient(circle at 80% 24%, rgba(236,72,153,0.2), transparent 18%)' }
  }
  return { ...base, background: 'radial-gradient(circle at 50% 0%, rgba(34,197,94,0.22), transparent 26%)' }
}

export function stageSetPieceStyle(tone: Parameters<typeof Stage>[0]['tone'], side: 'left' | 'right'): CSSProperties {
  const isLeft = side === 'left'
  const colors: Record<Parameters<typeof Stage>[0]['tone'], [string, string]> = {
    terrace: ['#22c55e', '#92400e'],
    felt: ['#16a34a', '#064e3b'],
    court: ['#f97316', '#0ea5e9'],
    pool: ['#0f766e', '#78350f'],
    bamboo: ['#84cc16', '#166534'],
    salon: ['#f59e0b', '#7f1d1d'],
    neon: ['#06b6d4', '#a855f7'],
  }
  const [primary, secondary] = colors[tone]
  return {
    position: 'absolute',
    left: isLeft ? '5%' : undefined,
    right: isLeft ? undefined : '5%',
    bottom: isLeft ? 42 : 58,
    width: isLeft ? 86 : 118,
    height: isLeft ? 42 : 52,
    borderRadius: '50%',
    background: `linear-gradient(145deg, ${primary}, ${secondary})`,
    opacity: 0.38,
    transform: `rotateX(62deg) rotateZ(${isLeft ? -8 : 12}deg)`,
    boxShadow: `0 22px 34px rgba(0,0,0,0.34), inset 0 5px 0 rgba(255,255,255,0.18)`,
    pointerEvents: 'none',
    zIndex: 1,
  }
}

export const mahjongFaces = ['bam', 'lotus', 'moon', 'sun', 'tea', 'chef', 'tower', 'leaf', 'wok', 'rice', 'star', 'bell']

export function createMahjongTiles() {
  return shuffle(mahjongFaces.flatMap((face) => [0, 1].map((copy) => ({ id: `${face}-${copy}`, face, matched: false }))))
}


export function tileFace(face: string) {
  const faces: Record<string, string> = {
    bam: 'III',
    lotus: '*',
    moon: 'C',
    sun: 'O',
    tea: 'T',
    chef: 'H',
    tower: 'A',
    leaf: 'Y',
    wok: 'W',
    rice: '#',
    star: '+',
    bell: 'B',
  }
  return faces[face] ?? '?'
}

export const differences = [
  { id: 'tower-light', label: 'lumiere tour', x: 72, y: 16 },
  { id: 'tree-fruit', label: 'fruit arbre', x: 19, y: 23 },
  { id: 'menu-price', label: 'prix menu', x: 51, y: 42 },
  { id: 'chair', label: 'chaise', x: 67, y: 62 },
  { id: 'cup', label: 'tasse', x: 31, y: 64 },
  { id: 'lamp', label: 'lampe', x: 83, y: 41 },
  { id: 'stripe', label: 'store', x: 42, y: 22 },
  { id: 'plate', label: 'assiette', x: 47, y: 67 },
  { id: 'window', label: 'fenêtre', x: 73, y: 35 },
  { id: 'path', label: 'dalle', x: 57, y: 82 },
  { id: 'flower', label: 'fleur', x: 16, y: 72 },
]


export function BistroScene({ variant }: { variant: 'left' | 'right' }) {
  return (
    <div style={bistroPanelStyle}>
      <div style={{ ...sceneTreeStyle, ...(variant === 'right' ? { boxShadow: '18px -8px 0 rgba(245,158,11,0.9)' } : {}) }} />
      <div style={sceneTowerStyle}>
        <span style={{ background: variant === 'right' ? '#22c55e' : '#f59e0b' }} />
      </div>
      <div style={awningStyle}>
        <span style={{ background: variant === 'right' ? '#06b6d4' : '#ef4444' }} />
        <span />
        <span />
      </div>
      <div style={menuBoardStyle}>{variant === 'right' ? '11' : '10'}</div>
      <div style={tableSceneShapeStyle}>
        <span style={{ left: variant === 'right' ? 46 : 36 }} />
        <span style={{ background: variant === 'right' ? '#f8fafc' : '#facc15' }} />
      </div>
      <div style={{ ...chairShapeStyle, right: variant === 'right' ? 40 : 56 }} />
      <div style={{ ...lampShapeStyle, opacity: variant === 'right' ? 0.35 : 1 }} />
      <div style={{ ...flowerShapeStyle, transform: variant === 'right' ? 'scale(1.25)' : 'scale(1)' }} />
    </div>
  )
}

export function createRun21Deck() {
  return shuffle(makeDeck('run21').map((card) => ({ ...card, value: Math.min(card.value, 10) })))
}


export function createTriCards() {
  const deck = makeDeck('tri')
  return { open: deck.slice(0, 18), stock: deck.slice(18), foundation: deck[18] }
}

export function adjacent(a: Card, b: Card) {
  const lowA = a.value === 1 ? 14 : a.value
  const lowB = b.value === 1 ? 14 : b.value
  return Math.abs(lowA - lowB) === 1 || Math.abs(a.value - b.value) === 12
}


export function sortHand(hand: Card[]) {
  const suitOrder: Record<CardSuit, number> = { S: 0, H: 1, D: 2, C: 3 }
  return [...hand].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || a.value - b.value)
}

// Une suite avec jokers est valide si les nombres réels (distincts) tiennent dans une
// fenêtre de `total` entiers consécutifs de [minV,maxV], les jokers comblant les trous.
function runWithJokersOK(nums: number[], jokers: number, minV = 1, maxV = 13): boolean {
  if (new Set(nums).size !== nums.length) return false
  const total = nums.length + jokers
  if (total < 3 || total > maxV - minV + 1) return false
  if (nums.length === 0) return true
  const lo = Math.min(...nums), hi = Math.max(...nums)
  const startMin = Math.max(minV, hi - total + 1)
  const startMax = Math.min(lo, maxV - total + 1)
  return startMin <= startMax
}

export function isRamiMeld(cards: Card[]) {
  if (cards.length < 3) return false
  const reals = cards.filter((c) => !c.joker)
  const jokers = cards.length - reals.length
  if (jokers === 0) {
    const sameRank = cards.every((card) => card.value === cards[0].value)
    const differentSuits = new Set(cards.map((card) => card.suit)).size === cards.length
    if (sameRank && differentSuits) return true
    const sameSuit = cards.every((card) => card.suit === cards[0].suit)
    const values = cards.map((card) => card.value).sort((a, b) => a - b)
    const run = values.every((value, index) => index === 0 || value === values[index - 1] + 1)
    return sameSuit && run
  }
  // Groupe (même valeur, couleurs distinctes, max 4) OU suite (même couleur, trous comblés par jokers).
  const groupOK = (reals.length === 0 || reals.every((c) => c.value === reals[0].value))
    && new Set(reals.map((c) => c.suit)).size === reals.length
    && cards.length <= 4
  if (groupOK) return true
  const sameSuit = reals.length === 0 || reals.every((c) => c.suit === reals[0].suit)
  return sameSuit && runWithJokersOK(reals.map((c) => c.value), jokers)
}

/** Cherche une combinaison valide (meld) dans une main — brute force sur triples/quadruples. */
export function findMeld(hand: Card[]): Card[] | null {
  const n = hand.length
  for (let size = 3; size <= 4; size++) {
    const combo: number[] = []
    const backtrack = (start: number): Card[] | null => {
      if (combo.length === size) {
        const cards = combo.map((i) => hand[i])
        return isRamiMeld(cards) ? cards : null
      }
      for (let i = start; i < n; i++) {
        combo.push(i)
        const found = backtrack(i + 1)
        combo.pop()
        if (found) return found
      }
      return null
    }
    const result = backtrack(0)
    if (result) return result
  }
  return null
}


export function makeRummiTiles() {
  const colors = ['#ef4444', '#2563eb', '#f59e0b', '#111827']
  const tiles: Tile[] = [0, 1].flatMap((set) => colors.flatMap((color) => Array.from({ length: 13 }, (_, index) => ({
    id: `tile-${set}-${color}-${index + 1}`,
    color,
    number: index + 1,
  }))))
  // 2 jokers (number 10 : score/tri uniquement ; ignoré par la validation joker-aware)
  const jokers: Tile[] = [0, 1].map((i) => ({ id: `tile-joker-${i}`, color: 'joker', number: 10, joker: true }))
  return shuffle([...tiles, ...jokers])
}

export function isRummiMeld(tiles: Tile[]) {
  if (tiles.length < 3) return false
  const reals = tiles.filter((t) => !t.joker)
  const jokers = tiles.length - reals.length
  if (jokers === 0) {
    const sameNumber = tiles.every((tile) => tile.number === tiles[0].number)
    const uniqueColors = new Set(tiles.map((tile) => tile.color)).size === tiles.length
    if (sameNumber && uniqueColors) return true
    const sameColor = tiles.every((tile) => tile.color === tiles[0].color)
    const values = tiles.map((tile) => tile.number).sort((a, b) => a - b)
    return sameColor && values.every((value, index) => index === 0 || value === values[index - 1] + 1)
  }
  const groupOK = (reals.length === 0 || reals.every((t) => t.number === reals[0].number))
    && new Set(reals.map((t) => t.color)).size === reals.length
    && tiles.length <= 4
  if (groupOK) return true
  const sameColor = reals.length === 0 || reals.every((t) => t.color === reals[0].color)
  return sameColor && runWithJokersOK(reals.map((t) => t.number), jokers)
}

/** Cherche un groupe/suite valide (3-4 tuiles) dans un chevalet — brute force. */
export function findRummiMeld(rack: Tile[]): Tile[] | null {
  const n = rack.length
  for (let size = 3; size <= 4; size++) {
    const combo: number[] = []
    const backtrack = (start: number): Tile[] | null => {
      if (combo.length === size) {
        const tiles = combo.map((i) => rack[i])
        return isRummiMeld(tiles) ? tiles : null
      }
      for (let i = start; i < n; i++) {
        combo.push(i)
        const found = backtrack(i + 1)
        combo.pop()
        if (found) return found
      }
      return null
    }
    const result = backtrack(0)
    if (result) return result
  }
  return null
}

export const sortTiles = (tiles: Tile[]) => [...tiles].sort((a, b) => a.color.localeCompare(b.color) || a.number - b.number)


export function RummiTile({ tile, selected, onClick, small }: { tile: Tile; selected?: boolean; onClick?: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        ...rummiTileStyle,
        width: small ? 38 : 48,
        height: small ? 52 : 66,
        borderColor: selected ? ACCENT2 : 'rgba(15,23,42,0.16)',
        transform: selected ? 'translateY(-10px) rotateX(12deg)' : 'rotateX(12deg)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {tile.joker
        ? <span style={{ color: ACCENT, fontSize: small ? 16 : 20, fontWeight: 900 }}>★</span>
        : <span style={{ color: tile.color }}>{tile.number}</span>}
    </button>
  )
}

export const hintStyle: CSSProperties = {
  color: MUTED,
  fontSize: 12,
  lineHeight: 1.45,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  padding: 10,
}

export const stageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  position: 'relative',
  overflow: 'auto',
  padding: 18,
  perspective: 1200,
  boxShadow: 'inset 0 -90px 120px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
}

export const floorStyle: CSSProperties = {
  position: 'absolute',
  left: '7%',
  right: '7%',
  bottom: 18,
  height: '42%',
  borderRadius: '50% 50% 0 0',
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2), rgba(255,255,255,0.06) 58%, transparent 72%)',
  transform: 'rotateX(64deg)',
  transformOrigin: 'bottom',
  boxShadow: '0 -24px 55px rgba(255,255,255,0.08)',
}

export const stageContentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  minHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const mahjongGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(42px, 74px))',
  gap: 10,
  padding: 16,
  borderRadius: 20,
  background: 'rgba(2,6,23,0.42)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 44px rgba(0,0,0,0.36)',
}

export const mahjongTileStyle: CSSProperties = {
  aspectRatio: '0.72',
  borderRadius: 12,
  border: '2px solid rgba(255,255,255,0.18)',
  background: 'linear-gradient(145deg, #f8fafc, #d9f99d)',
  boxShadow: '0 16px 18px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.8)',
  display: 'grid',
  placeItems: 'center',
  gap: 2,
  cursor: 'pointer',
}

export const mahjongGlyphStyle: CSSProperties = {
  color: '#14532d',
  fontSize: 22,
  fontWeight: 950,
  lineHeight: 1,
}

export const spotWrapperStyle: CSSProperties = {
  width: 'min(860px, 100%)',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
  gap: 14,
}

export const bistroPanelStyle: CSSProperties = {
  minHeight: 360,
  position: 'relative',
  borderRadius: 18,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'linear-gradient(180deg, #7dd3fc 0 42%, #fef3c7 42% 48%, #166534 48% 100%)',
  boxShadow: '0 22px 38px rgba(0,0,0,0.34)',
}

export const sceneTreeStyle: CSSProperties = {
  position: 'absolute',
  left: 28,
  top: 34,
  width: 94,
  height: 94,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #22c55e 0 56%, #166534 57%)',
}

export const sceneTowerStyle: CSSProperties = {
  position: 'absolute',
  right: 44,
  top: 38,
  width: 52,
  height: 130,
  background: 'linear-gradient(180deg, #f8fafc, #94a3b8)',
  clipPath: 'polygon(24% 0, 76% 0, 100% 100%, 0 100%)',
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 18,
}

export const awningStyle: CSSProperties = {
  position: 'absolute',
  left: 152,
  top: 78,
  display: 'flex',
  width: 126,
  height: 32,
  borderRadius: '14px 14px 5px 5px',
  overflow: 'hidden',
}

export const menuBoardStyle: CSSProperties = {
  position: 'absolute',
  left: '45%',
  top: '38%',
  width: 54,
  height: 70,
  borderRadius: 8,
  background: '#111827',
  color: '#facc15',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 950,
}

export const tableSceneShapeStyle: CSSProperties = {
  position: 'absolute',
  left: '34%',
  bottom: 66,
  width: 170,
  height: 70,
  borderRadius: '50%',
  background: '#92400e',
}

export const chairShapeStyle: CSSProperties = {
  position: 'absolute',
  bottom: 56,
  width: 38,
  height: 58,
  borderRadius: 12,
  background: '#dc2626',
}

export const lampShapeStyle: CSSProperties = {
  position: 'absolute',
  right: 22,
  top: 126,
  width: 22,
  height: 92,
  background: '#111827',
  borderRadius: 999,
}

export const flowerShapeStyle: CSSProperties = {
  position: 'absolute',
  left: 46,
  bottom: 72,
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #f9a8d4 0 22%, #be123c 24% 100%)',
}

export const cardArcadeLayoutStyle: CSSProperties = {
  display: 'grid',
  gap: 18,
  justifyItems: 'center',
  width: 'min(760px, 100%)',
}

export const currentCardSlotStyle: CSSProperties = {
  minHeight: 118,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

export const runColumnsStyle: CSSProperties = {
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(84px, 1fr))',
  gap: 10,
}

export function runColumnStyle(sum: number, canPlace: boolean): CSSProperties {
  return {
    minHeight: 280,
    borderRadius: 14,
    padding: 10,
    border: `1px solid ${sum === 21 ? 'rgba(34,197,94,0.65)' : canPlace ? 'rgba(6,182,212,0.44)' : 'rgba(255,255,255,0.12)'}`,
    background: canPlace ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: canPlace ? 'pointer' : 'default',
  }
}

export const triLayoutStyle: CSSProperties = {
  width: 'min(820px, 100%)',
  display: 'grid',
  gap: 28,
  justifyItems: 'center',
}

export const triTowersStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(54px, 76px))',
  gap: 10,
  padding: 18,
  borderRadius: 18,
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(255,255,255,0.1)',
}

export const foundationStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
}

export const ramiTableStyle: CSSProperties = {
  width: 'min(880px, 100%)',
  display: 'grid',
  gap: 18,
}

export const meldPreviewStyle: CSSProperties = {
  minHeight: 104,
  borderRadius: 16,
  border: '1px dashed rgba(255,255,255,0.18)',
  background: 'rgba(2,6,23,0.4)',
  color: MUTED,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 12,
  flexWrap: 'wrap',
}

export const ramiHandStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: 14,
  borderRadius: 18,
  background: 'rgba(2,6,23,0.44)',
  border: '1px solid rgba(255,255,255,0.12)',
}

export const rummiBoardStyle: CSSProperties = {
  width: 'min(840px, 100%)',
  display: 'grid',
  gap: 18,
}

export const rummiMeldsStyle: CSSProperties = {
  minHeight: 160,
  borderRadius: 18,
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  justifyContent: 'center',
}

export const rummiMeldRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  padding: 7,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
}

export const rummiRackStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: 14,
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(120,53,15,0.9), rgba(69,26,3,0.92))',
  border: '1px solid rgba(251,191,36,0.24)',
}

export const rummiTileStyle: CSSProperties = {
  borderRadius: 8,
  border: '2px solid rgba(15,23,42,0.16)',
  background: 'linear-gradient(145deg, #fff7ed, #e2e8f0)',
  boxShadow: '0 14px 18px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.8)',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 950,
  fontSize: 20,
  transition: 'transform 160ms ease, border-color 160ms ease',
}

export { ActionButton, CardBack, Game3DShell, MiniCard, StatPill, ghostButtonStyle } from './arcade3d'
export { ACCENT, ACCENT2, BORDER, MUTED, SURFACE2, TEXT } from './theme'
export { default as GameOverModal } from './GameOverModal'
export { useGameScore } from './useGameScore'
