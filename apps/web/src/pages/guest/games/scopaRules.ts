export type ScopaSuit = 'coppe' | 'denari' | 'bastoni' | 'spade'

export interface ScopaCard {
  suit: ScopaSuit
  value: number
  id: string
}

export interface ScoreDetail {
  category: string
  playerIndex: number | null
  points: number
}

export interface ScopaState {
  deck: ScopaCard[]
  hands: ScopaCard[][]
  table: ScopaCard[]
  captures: ScopaCard[][]
  scopas: number[]
  currentPlayerIndex: number
  numPlayers: number
  phase: 'playing' | 'roundEnd' | 'gameEnd'
  scores: number[]
  lastCapturePlayer: number | null
  roundScoreDetails: ScoreDetail[] | null
}

export const SCOPA_TARGET_SCORE = 11
export const SCOPA_SUITS: ScopaSuit[] = ['coppe', 'denari', 'bastoni', 'spade']

export const SUIT_SYMBOLS: Record<ScopaSuit, string> = {
  coppe: 'C',
  denari: 'D',
  bastoni: 'B',
  spade: 'S',
}

export const SUIT_LABELS: Record<ScopaSuit, string> = {
  coppe: 'Coppe',
  denari: 'Denari',
  bastoni: 'Bastoni',
  spade: 'Spade',
}

const PRIMIERA_VALUES: Record<number, number> = {
  7: 21,
  6: 18,
  1: 16,
  5: 15,
  4: 14,
  3: 13,
  2: 12,
  8: 10,
  9: 10,
  10: 10,
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function createScopaDeck() {
  const deck: ScopaCard[] = []
  for (const suit of SCOPA_SUITS) {
    for (let value = 1; value <= 10; value++) {
      deck.push({ suit, value, id: `${suit}-${value}` })
    }
  }
  return shuffle(deck)
}

function hasThreeSameValue(cards: ScopaCard[]) {
  const counts = new Map<number, number>()
  for (const card of cards) counts.set(card.value, (counts.get(card.value) ?? 0) + 1)
  return [...counts.values()].some((count) => count >= 3)
}

function dealInitial(state: ScopaState): ScopaState {
  let deck = [...state.deck]
  const hands: ScopaCard[][] = Array.from({ length: state.numPlayers }, () => [])
  let table: ScopaCard[] = []

  const deal = () => {
    hands.forEach((hand) => hand.splice(0))
    table = []
    for (let i = 0; i < 3; i++) {
      for (let p = 0; p < state.numPlayers; p++) {
        const card = deck.pop()
        if (card) hands[p].push(card)
      }
    }
    for (let i = 0; i < 4; i++) {
      const card = deck.pop()
      if (card) table.push(card)
    }
  }

  deal()
  let attempts = 0
  while (hasThreeSameValue(table) && attempts < 8) {
    deck = shuffle([...deck, ...table, ...hands.flat()])
    deal()
    attempts++
  }

  return { ...state, deck, hands, table }
}

export function initScopaGame(numPlayers: number): ScopaState {
  const players = Math.max(2, Math.min(4, numPlayers))
  return dealInitial({
    deck: createScopaDeck(),
    hands: Array.from({ length: players }, () => []),
    table: [],
    captures: Array.from({ length: players }, () => []),
    scopas: Array.from({ length: players }, () => 0),
    currentPlayerIndex: 0,
    numPlayers: players,
    phase: 'playing',
    scores: Array.from({ length: players }, () => 0),
    lastCapturePlayer: null,
    roundScoreDetails: null,
  })
}

function dealNewHand(state: ScopaState): ScopaState {
  const deck = [...state.deck]
  const hands = state.hands.map((hand) => [...hand])
  for (let i = 0; i < 3; i++) {
    for (let p = 0; p < state.numPlayers; p++) {
      const card = deck.pop()
      if (card) hands[p].push(card)
    }
  }
  return { ...state, deck, hands }
}

function findCombinations(target: number, table: ScopaCard[], start: number, current: number[], out: number[][]) {
  if (target === 0 && current.length) {
    out.push([...current])
    return
  }
  if (target < 0) return
  for (let i = start; i < table.length; i++) {
    current.push(i)
    findCombinations(target - table[i].value, table, i + 1, current, out)
    current.pop()
  }
}

export function getValidCaptures(card: ScopaCard, table: ScopaCard[]) {
  const all: number[][] = []
  findCombinations(card.value, table, 0, [], all)
  const exact = all.filter((combo) => combo.length === 1)
  return exact.length ? exact : all
}

function sameCombo(a: number[], b: number[]) {
  const aa = [...a].sort((x, y) => x - y)
  const bb = [...b].sort((x, y) => x - y)
  return aa.length === bb.length && aa.every((value, index) => value === bb[index])
}

export function playScopaCard(state: ScopaState, playerIndex: number, cardIndex: number, captureIndices: number[]) {
  if (state.phase !== 'playing') return null
  if (playerIndex !== state.currentPlayerIndex) return null
  if (!state.hands[playerIndex]?.[cardIndex]) return null

  const card = state.hands[playerIndex][cardIndex]
  const valid = getValidCaptures(card, state.table)
  if (valid.length && !valid.some((combo) => sameCombo(combo, captureIndices))) return null
  if (!valid.length && captureIndices.length) return null

  const hands = state.hands.map((hand) => [...hand])
  const table = [...state.table]
  const captures = state.captures.map((pile) => [...pile])
  const scopas = [...state.scopas]
  const played = hands[playerIndex].splice(cardIndex, 1)[0]
  let lastCapturePlayer = state.lastCapturePlayer

  if (captureIndices.length) {
    const captured: ScopaCard[] = []
    for (const index of [...captureIndices].sort((a, b) => b - a)) {
      const [taken] = table.splice(index, 1)
      if (taken) captured.push(taken)
    }
    captures[playerIndex].push(played, ...captured)
    lastCapturePlayer = playerIndex
    if (table.length === 0) scopas[playerIndex] += 1
  } else {
    table.push(played)
  }

  let next: ScopaState = {
    ...state,
    hands,
    table,
    captures,
    scopas,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.numPlayers,
    lastCapturePlayer,
  }

  if (hands.every((hand) => hand.length === 0)) {
    if (state.deck.length) {
      next = dealNewHand(next)
    } else {
      if (next.lastCapturePlayer !== null && next.table.length) {
        const finalCaptures = next.captures.map((pile) => [...pile])
        finalCaptures[next.lastCapturePlayer].push(...next.table)
        next = { ...next, table: [], captures: finalCaptures }
      }
      const round = calculateRoundScores(next)
      const scores = next.scores.map((score, index) => score + round.scores[index])
      next = {
        ...next,
        scores,
        phase: Math.max(...scores) >= SCOPA_TARGET_SCORE ? 'gameEnd' : 'roundEnd',
        roundScoreDetails: round.details,
      }
    }
  }

  return next
}

export function calculateRoundScores(state: ScopaState) {
  const scores = Array.from({ length: state.numPlayers }, () => 0)
  const details: ScoreDetail[] = []
  scoreMost('Cartes', state.captures.map((pile) => pile.length), scores, details)
  scoreMost('Denari', state.captures.map((pile) => pile.filter((card) => card.suit === 'denari').length), scores, details)

  const settebello = state.captures.findIndex((pile) => pile.some((card) => card.suit === 'denari' && card.value === 7))
  if (settebello >= 0) {
    scores[settebello] += 1
    details.push({ category: 'Settebello', playerIndex: settebello, points: 1 })
  } else {
    details.push({ category: 'Settebello', playerIndex: null, points: 0 })
  }

  scoreMost('Primiera', state.captures.map((pile) => primiera(pile) ?? -1), scores, details)
  state.scopas.forEach((count, playerIndex) => {
    if (count > 0) {
      scores[playerIndex] += count
      details.push({ category: 'Scopa', playerIndex, points: count })
    }
  })

  return { scores, details }
}

function scoreMost(category: string, values: number[], scores: number[], details: ScoreDetail[]) {
  const max = Math.max(...values)
  const winners = values.reduce<number[]>((out, value, index) => {
    if (value === max && value > 0) out.push(index)
    return out
  }, [])
  if (winners.length === 1) {
    scores[winners[0]] += 1
    details.push({ category, playerIndex: winners[0], points: 1 })
  } else {
    details.push({ category, playerIndex: null, points: 0 })
  }
}

function primiera(cards: ScopaCard[]) {
  const best = new Map<ScopaSuit, number>()
  for (const card of cards) {
    const value = PRIMIERA_VALUES[card.value] ?? 0
    if (value > (best.get(card.suit) ?? 0)) best.set(card.suit, value)
  }
  if (best.size < 4) return null
  return [...best.values()].reduce((sum, value) => sum + value, 0)
}

export function startScopaRound(state: ScopaState): ScopaState {
  return dealInitial({
    ...state,
    deck: createScopaDeck(),
    hands: Array.from({ length: state.numPlayers }, () => []),
    table: [],
    captures: Array.from({ length: state.numPlayers }, () => []),
    scopas: Array.from({ length: state.numPlayers }, () => 0),
    currentPlayerIndex: 0,
    phase: 'playing',
    lastCapturePlayer: null,
    roundScoreDetails: null,
  })
}

export function scopaWinner(state: ScopaState) {
  const max = Math.max(...state.scores)
  const winners = state.scores.reduce<number[]>((out, score, index) => {
    if (score === max) out.push(index)
    return out
  }, [])
  return winners.length === 1 ? winners[0] : null
}
