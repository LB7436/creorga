import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Sueca / Skoopa — variante simplifiée 1 vs 1 (basée sur la Sueca portugaise).
 * Jeu portugais classique. Deck 40 cartes (A,2-7,J,Q,K × 4 couleurs).
 * Valeurs : A=11, 7=10, R(K)=4, V(J)=3, D(Q)=2, autres=0. Total : 120 points.
 * Atout (trunfo) tiré au sort. Doit suivre la couleur si possible.
 * Premier à >60 points gagne.
 */

type Suit = '♠' | '♥' | '♦' | '♣'
interface Card { suit: Suit; rank: number; label: string; value: number }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
// Sueca uses A,2,3,4,5,6,7,J,Q,K — and A is high
const RANKS: { r: number; label: string; value: number; rankOrder: number }[] = [
  { r: 14, label: 'A', value: 11, rankOrder: 10 },
  { r: 7,  label: '7', value: 10, rankOrder: 9 },
  { r: 13, label: 'R', value: 4,  rankOrder: 8 }, // Rei (K)
  { r: 12, label: 'D', value: 3,  rankOrder: 7 }, // Dama (Q)
  { r: 11, label: 'V', value: 2,  rankOrder: 6 }, // Valete (J)
  { r: 6,  label: '6', value: 0,  rankOrder: 5 },
  { r: 5,  label: '5', value: 0,  rankOrder: 4 },
  { r: 4,  label: '4', value: 0,  rankOrder: 3 },
  { r: 3,  label: '3', value: 0,  rankOrder: 2 },
  { r: 2,  label: '2', value: 0,  rankOrder: 1 },
]

function rankOrder(r: number): number {
  return RANKS.find((x) => x.r === r)?.rankOrder || 0
}

function buildDeck(): Card[] {
  const d: Card[] = []
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r.r, label: r.label, value: r.value })
  return d.sort(() => Math.random() - 0.5)
}

interface Trick { player: Card | null; cpu: Card | null; leader: 'player' | 'cpu' }

export default function Sueca({ accent }: { accent: string }) {
  const [deck, setDeck] = useState<Card[]>([])
  const [trump, setTrump] = useState<Suit>('♠')
  const [player, setPlayer] = useState<Card[]>([])
  const [cpu, setCpu] = useState<Card[]>([])
  const [trick, setTrick] = useState<Trick>({ player: null, cpu: null, leader: 'player' })
  const [scoreP, setScoreP] = useState(0)
  const [scoreC, setScoreC] = useState(0)
  const [trickInProgress, setTrickInProgress] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [over, setOver] = useState(false)
  const [trickCount, setTrickCount] = useState(0)

  // Init game
  useEffect(() => { dealNewGame() }, [])

  const dealNewGame = () => {
    const d = buildDeck()
    const p = d.slice(0, 10).sort((a, b) => a.suit.localeCompare(b.suit) || rankOrder(b.rank) - rankOrder(a.rank))
    const c = d.slice(10, 20)
    const trumpCard = d[20]
    setDeck(d.slice(21))
    setTrump(trumpCard.suit)
    setPlayer(p)
    setCpu(c)
    setTrick({ player: null, cpu: null, leader: 'player' })
    setScoreP(0); setScoreC(0); setMessage(''); setOver(false); setTrickCount(0)
  }

  const cardWinner = (a: Card, b: Card, leadSuit: Suit): 'a' | 'b' => {
    // a leads, b follows
    if (a.suit === b.suit) return rankOrder(a.rank) > rankOrder(b.rank) ? 'a' : 'b'
    if (b.suit === trump && a.suit !== trump) return 'b'
    if (a.suit === trump && b.suit !== trump) return 'a'
    // b didn't follow suit and didn't trump → a wins
    return 'a'
  }

  // CPU plays
  const cpuChoose = (mustFollow?: Suit, opponentCard?: Card): Card => {
    let candidates = cpu
    if (mustFollow) {
      const sameSuit = cpu.filter((c) => c.suit === mustFollow)
      if (sameSuit.length > 0) candidates = sameSuit
    }
    // strategy : if leading, play low non-trump; if winning trick possible, play to win with low value card
    if (opponentCard) {
      // try to win cheaply
      const winners = candidates.filter((c) => cardWinner(opponentCard, c, opponentCard.suit) === 'b')
      if (winners.length > 0) {
        winners.sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank))
        return winners[0]
      }
      // can't win — dump low value
      candidates.sort((a, b) => a.value - b.value || rankOrder(a.rank) - rankOrder(b.rank))
      return candidates[0]
    }
    // leading : play medium card, avoid trump
    const noTrump = candidates.filter((c) => c.suit !== trump)
    const pool = noTrump.length > 0 ? noTrump : candidates
    pool.sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank))
    return pool[Math.floor(pool.length / 3)]
  }

  const canPlay = (card: Card): boolean => {
    if (over || trickInProgress) return false
    // if CPU led, player must follow suit if possible
    if (trick.leader === 'cpu' && trick.cpu) {
      const lead = trick.cpu.suit
      const hasSame = player.some((c) => c.suit === lead)
      if (hasSame && card.suit !== lead) return false
    }
    return true
  }

  const playerPlay = (card: Card) => {
    if (!canPlay(card)) return
    setTrickInProgress(true)
    if (trick.leader === 'player') {
      // player leads, cpu responds
      setTrick({ ...trick, player: card })
      setPlayer(player.filter((c) => c !== card))
      setTimeout(() => {
        const cpuCard = cpuChoose(card.suit, card)
        const cpuRest = cpu.filter((c) => c !== cpuCard)
        setCpu(cpuRest)
        setTrick({ leader: 'player', player: card, cpu: cpuCard })
        setTimeout(() => resolveTrick(card, cpuCard, 'player', cpuRest, player.filter((c) => c !== card)), 700)
      }, 500)
    } else {
      // cpu led, player responds
      const cpuCard = trick.cpu!
      const newPlayer = player.filter((c) => c !== card)
      setPlayer(newPlayer)
      setTrick({ ...trick, player: card })
      setTimeout(() => resolveTrick(cpuCard, card, 'cpu', cpu, newPlayer), 700)
    }
  }

  const resolveTrick = (lead: Card, follow: Card, leader: 'player' | 'cpu', cpuRest: Card[], playerRest: Card[]) => {
    const winner = cardWinner(lead, follow, lead.suit)
    const points = lead.value + follow.value
    const winnerSide: 'player' | 'cpu' = winner === 'a' ? leader : (leader === 'player' ? 'cpu' : 'player')
    let newScoreP = scoreP, newScoreC = scoreC
    if (winnerSide === 'player') { newScoreP += points; setScoreP(newScoreP); setMessage(`✅ Pli gagné +${points}`) }
    else { newScoreC += points; setScoreC(newScoreC); setMessage(`❌ Pli perdu (CPU +${points})`) }

    setTimeout(() => {
      const nextTrickCount = trickCount + 1
      setTrickCount(nextTrickCount)
      if (playerRest.length === 0 && cpuRest.length === 0) {
        // game over
        const won = newScoreP > newScoreC
        setMessage(won ? `🏆 Vous gagnez ! ${newScoreP} vs ${newScoreC}` : `😢 CPU gagne ${newScoreC} vs ${newScoreP}`)
        setOver(true)
        setTrick({ player: null, cpu: null, leader: 'player' })
        setTrickInProgress(false)
        return
      }
      // setup next trick — winner leads
      if (winnerSide === 'cpu') {
        // CPU leads next
        const cpuLead = cpuChoose()
        setCpu(cpuRest.filter((c) => c !== cpuLead))
        setTrick({ leader: 'cpu', player: null, cpu: cpuLead })
        setTrickInProgress(false)
      } else {
        setTrick({ leader: 'player', player: null, cpu: null })
        setTrickInProgress(false)
      }
    }, 1500)
  }

  const sortedPlayer = [...player].sort((a, b) =>
    a.suit.localeCompare(b.suit) || rankOrder(b.rank) - rankOrder(a.rank)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 460, width: '100%' }}>
      <div style={hud(accent)}>
        <div>
          <div style={hudLabel}>VOUS</div>
          <div style={hudValue('#10b981')}>{scoreP} pts</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={hudLabel}>ATOUT</div>
          <div style={{ fontSize: 28, color: trump === '♥' || trump === '♦' ? '#ef4444' : '#fff' }}>{trump}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={hudLabel}>CPU</div>
          <div style={hudValue('#ef4444')}>{scoreC} pts</div>
        </div>
      </div>

      {/* CPU back-cards */}
      <div style={{ display: 'flex', gap: 2 }}>
        {cpu.slice(0, Math.min(cpu.length, 10)).map((_, i) => (
          <div key={i} style={{
            width: 22, height: 32, borderRadius: 4,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: '1px solid rgba(255,255,255,0.2)',
          }} />
        ))}
      </div>

      {/* Trick area */}
      <div style={{
        height: 110, width: '100%', borderRadius: 10,
        background: 'linear-gradient(135deg, #064e3b, #022c22)',
        border: '2px solid rgba(16,185,129,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        position: 'relative',
      }}>
        <AnimatePresence>
          {trick.cpu && <CardView key={`cpu-${trick.cpu.label}-${trick.cpu.suit}`} card={trick.cpu} label="CPU" />}
          {trick.player && <CardView key={`p-${trick.player.label}-${trick.player.suit}`} card={trick.player} label="Vous" />}
        </AnimatePresence>
        {!trick.cpu && !trick.player && !over && (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {trick.leader === 'player' ? 'À vous de mener…' : 'CPU joue…'}
          </span>
        )}
        {message && (
          <div style={{
            position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: message.includes('gagn') ? '#10b981' : '#ef4444',
            background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 999, fontWeight: 700,
          }}>{message}</div>
        )}
      </div>

      {/* Player hand */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', minHeight: 90 }}>
        {sortedPlayer.map((c, i) => {
          const playable = canPlay(c)
          return (
            <motion.button
              key={`${c.suit}-${c.label}-${i}`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: playable ? -8 : 0 }}
              onClick={() => playerPlay(c)}
              disabled={!playable}
              style={{
                width: 44, height: 64, borderRadius: 6, padding: 4,
                background: playable ? '#fff' : 'rgba(255,255,255,0.4)',
                color: c.suit === '♥' || c.suit === '♦' ? '#ef4444' : '#0f172a',
                cursor: playable ? 'pointer' : 'not-allowed',
                border: c.suit === trump ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                fontWeight: 800, fontSize: 11,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                opacity: playable ? 1 : 0.5,
              }}>
              <div>{c.label}</div>
              <div style={{ textAlign: 'center', fontSize: 18 }}>{c.suit}</div>
            </motion.button>
          )
        })}
      </div>

      {over && (
        <button onClick={dealNewGame} style={{
          width: '100%', padding: '12px 20px', borderRadius: 999, border: 'none',
          background: `linear-gradient(135deg, ${accent}, #ec4899)`,
          color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>🔄 Nouvelle partie</button>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
        Carte avec bordure jaune = atout · A=11 · 7=10 · R=4 · D=3 · V=2 · Suivre la couleur si possible
      </p>
    </div>
  )
}

function CardView({ card, label }: { card: Card; label: string }) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <motion.div
      initial={{ scale: 0, y: -20, rotate: -12 }}
      animate={{ scale: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 180 }}
      style={{
        width: 50, height: 72, borderRadius: 8, padding: 4,
        background: '#fff',
        color: isRed ? '#ef4444' : '#0f172a',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        fontWeight: 800, position: 'relative',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      }}>
      <div style={{ fontSize: 12 }}>{card.label}</div>
      <div style={{ textAlign: 'center', fontSize: 22 }}>{card.suit}</div>
      <div style={{
        position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap',
      }}>{label}</div>
    </motion.div>
  )
}

const hud = (accent: string): React.CSSProperties => ({
  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 14px', borderRadius: 10,
  background: `linear-gradient(135deg, ${accent}15, #ec489915)`,
  border: `1px solid ${accent}30`,
})
const hudLabel: React.CSSProperties = { fontSize: 9, color: '#94a3b8', letterSpacing: 1 }
const hudValue = (color: string): React.CSSProperties => ({ fontSize: 18, fontWeight: 800, color })
