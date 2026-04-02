import React, { useState, useEffect, useRef } from 'react';

// ─── Theme ───────────────────────────────────────────────────────────────────
const ACCENT = '#a855f7';
const SURFACE = '#0e0d20';
const SURFACE2 = '#16153a';
const BORDER = 'rgba(168,85,247,0.18)';
const TEXT = '#f8fafc';
const MUTED = '#94a3b8';

// ─── Types ────────────────────────────────────────────────────────────────────
type Suit = '♠' | '♣' | '♥' | '♦';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type Phase = 'betting' | 'playing' | 'dealer' | 'result';
type Result = 'win' | 'blackjack' | 'lose' | 'push' | null;

interface Card {
  suit: Suit;
  rank: Rank;
  hidden: boolean;
  id: string;
  dealt: boolean;
}

interface ChipDef {
  value: number;
  color: string;
  label: string;
  textColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SUITS: Suit[] = ['♠', '♣', '♥', '♦'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface TableDef {
  name: string;
  minBet: number;
  bankroll: number;
  chips: ChipDef[];
  highStakes: boolean;
}

const TABLES: TableDef[] = [
  {
    name: '1€', minBet: 1, bankroll: 200, highStakes: false,
    chips: [
      { value: 1,  color: '#94a3b8', label: '1€',  textColor: '#111' },
      { value: 2,  color: '#dc2626', label: '2€',  textColor: '#fff' },
      { value: 5,  color: '#2563eb', label: '5€',  textColor: '#fff' },
      { value: 10, color: '#16a34a', label: '10€', textColor: '#fff' },
      { value: 25, color: '#1c1917', label: '25€', textColor: '#fff' },
    ],
  },
  {
    name: '5€', minBet: 5, bankroll: 1000, highStakes: false,
    chips: [
      { value: 5,   color: '#dc2626', label: '5€',   textColor: '#fff' },
      { value: 10,  color: '#2563eb', label: '10€',  textColor: '#fff' },
      { value: 25,  color: '#16a34a', label: '25€',  textColor: '#fff' },
      { value: 50,  color: '#1c1917', label: '50€',  textColor: '#fff' },
      { value: 100, color: '#b45309', label: '100€', textColor: '#fde68a' },
    ],
  },
  {
    name: '10€', minBet: 10, bankroll: 2000, highStakes: false,
    chips: [
      { value: 10,  color: '#dc2626', label: '10€',  textColor: '#fff' },
      { value: 25,  color: '#2563eb', label: '25€',  textColor: '#fff' },
      { value: 50,  color: '#16a34a', label: '50€',  textColor: '#fff' },
      { value: 100, color: '#1c1917', label: '100€', textColor: '#fff' },
      { value: 250, color: '#b45309', label: '250€', textColor: '#fde68a' },
    ],
  },
  {
    name: '25€', minBet: 25, bankroll: 5000, highStakes: true,
    chips: [
      { value: 25,  color: '#dc2626', label: '25€',  textColor: '#fff' },
      { value: 50,  color: '#2563eb', label: '50€',  textColor: '#fff' },
      { value: 100, color: '#16a34a', label: '100€', textColor: '#fff' },
      { value: 250, color: '#1c1917', label: '250€', textColor: '#fff' },
      { value: 500, color: '#b45309', label: '500€', textColor: '#fde68a' },
    ],
  },
  {
    name: '50€', minBet: 50, bankroll: 10000, highStakes: true,
    chips: [
      { value: 50,   color: '#dc2626', label: '50€',   textColor: '#fff' },
      { value: 100,  color: '#2563eb', label: '100€',  textColor: '#fff' },
      { value: 250,  color: '#16a34a', label: '250€',  textColor: '#fff' },
      { value: 500,  color: '#1c1917', label: '500€',  textColor: '#fff' },
      { value: 1000, color: '#b45309', label: '1000€', textColor: '#fde68a' },
    ],
  },
  {
    name: '100€', minBet: 100, bankroll: 20000, highStakes: true,
    chips: [
      { value: 100,  color: '#dc2626', label: '100€',  textColor: '#fff' },
      { value: 200,  color: '#2563eb', label: '200€',  textColor: '#fff' },
      { value: 500,  color: '#16a34a', label: '500€',  textColor: '#fff' },
      { value: 1000, color: '#1c1917', label: '1k€',   textColor: '#fff' },
      { value: 2500, color: '#b45309', label: '2.5k€', textColor: '#fde68a' },
    ],
  },
];

// Legacy default used only as fallback type reference
const CHIPS: ChipDef[] = TABLES[1].chips;

// Hoisted — stable reference, never recreated on render
const RESULT_COLORS: Record<NonNullable<Result>, string> = {
  blackjack: '#a855f7',
  win: '#10b981',
  lose: '#ef4444',
  push: '#f59e0b',
};

const RESULT_MESSAGES: Record<NonNullable<Result>, (bet: number) => string> = {
  blackjack: (bet) => `🎉 BLACKJACK ! +${Math.floor(bet * 1.5)}€`,
  win:       (bet) => `✓ Vous gagnez ! +${bet}€`,
  lose:      (bet) => `✗ Perdu. -${bet}€`,
  push:      ()    => `≈ Égalité — mise remboursée`,
};

const CONFETTI_COLORS = ['#f59e0b', '#a855f7', '#ec4899', '#10b981', '#3b82f6', '#ef4444', '#fbbf24', '#60a5fa'];

// Pre-computed so Confetti never re-randomises on re-render
const CONFETTI_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${30 + Math.random() * 40}%`,
  isCircle: i % 2 === 0,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: `${(0.8 + Math.random() * 0.6).toFixed(2)}s`,
  delay: `${(Math.random() * 0.4).toFixed(2)}s`,
  animIndex: i % 8,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, hidden: false, id: `${suit}${rank}${Math.random()}`, dealt: false });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardValue(rank: Rank): number {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank, 10);
}

function handScore(hand: Card[]): number {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.hidden) continue;
    score += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handScore(hand) === 21;
}

function isBust(hand: Card[]): boolean {
  return handScore(hand) > 21;
}

function freshShoe(): Card[] {
  return [
    ...createDeck(), ...createDeck(), ...createDeck(),
    ...createDeck(), ...createDeck(), ...createDeck(),
  ];
}

// ─── CSS Animations (injected once via useEffect, never during render) ────────
const ANIMATION_STYLES = `
  @keyframes slideInCard {
    from { transform: translate(var(--deck-x, 300px), var(--deck-y, -200px)) scale(0.5); opacity: 0; }
    to   { transform: translate(0, 0) scale(1); opacity: 1; }
  }
  @keyframes flipCard {
    0%   { transform: rotateY(90deg); }
    100% { transform: rotateY(0deg); }
  }
  @keyframes winPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
    50%      { box-shadow: 0 0 40px 20px rgba(251,191,36,0.4); }
  }
  @keyframes losePulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    50%      { box-shadow: 0 0 40px 20px rgba(239,68,68,0.4); }
  }
  @keyframes resultSlide {
    from { transform: translateY(-40px) scale(0.8); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes chipBounce {
    0%,100% { transform: scale(1); }
    40%     { transform: scale(1.18); }
    70%     { transform: scale(0.94); }
  }
  @keyframes confetti0 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-80px,-180px) rotate(720deg);opacity:0} }
  @keyframes confetti1 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(80px,-160px) rotate(-540deg);opacity:0} }
  @keyframes confetti2 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-30px,-200px) rotate(900deg);opacity:0} }
  @keyframes confetti3 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(60px,-190px) rotate(-720deg);opacity:0} }
  @keyframes confetti4 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-110px,-140px) rotate(600deg);opacity:0} }
  @keyframes confetti5 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(100px,-170px) rotate(-480deg);opacity:0} }
  @keyframes confetti6 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(20px,-210px) rotate(840deg);opacity:0} }
  @keyframes confetti7 { 0%{transform:translate(0,0) rotate(0deg);opacity:1} 100%{transform:translate(-60px,-150px) rotate(-660deg);opacity:0} }
  @keyframes avatarIdle {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-4px); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardProps {
  card: Card;
  index: number;
  isFlipping?: boolean;
}

function PlayingCard({ card, index, isFlipping }: CardProps) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const delay = index * 150;

  if (card.hidden) {
    return (
      <div
        style={{
          width: 80,
          height: 120,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)',
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          animation: card.dealt ? `slideInCard 0.4s ease ${delay}ms both` : undefined,
          '--deck-x': '280px',
          '--deck-y': '-160px',
        } as React.CSSProperties}
      >
        <div style={{
          position: 'absolute', inset: 6,
          backgroundImage: [
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px)',
            'repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px)',
          ].join(', '),
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)',
        }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: 80,
        height: 120,
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 5,
        position: 'relative',
        flexShrink: 0,
        animation: isFlipping
          ? `flipCard 0.35s ease ${delay}ms both`
          : card.dealt
          ? `slideInCard 0.4s ease ${delay}ms both`
          : undefined,
        '--deck-x': '280px',
        '--deck-y': '-160px',
      } as React.CSSProperties}
    >
      {/* Top-left */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isRed ? '#dc2626' : '#111', fontFamily: 'Georgia, serif' }}>{card.rank}</span>
        <span style={{ fontSize: 11, color: isRed ? '#dc2626' : '#111' }}>{card.suit}</span>
      </div>
      {/* Center suit */}
      <div style={{ textAlign: 'center', fontSize: 36, color: isRed ? '#dc2626' : '#111', lineHeight: 1, userSelect: 'none' }}>
        {card.suit}
      </div>
      {/* Bottom-right rotated */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1, transform: 'rotate(180deg)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isRed ? '#dc2626' : '#111', fontFamily: 'Georgia, serif' }}>{card.rank}</span>
        <span style={{ fontSize: 11, color: isRed ? '#dc2626' : '#111' }}>{card.suit}</span>
      </div>
    </div>
  );
}

function DealerAvatar() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'avatarIdle 3s ease-in-out infinite' }}>
      {/* Head */}
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fcd9b6', border: '2px solid rgba(255,255,255,0.2)', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'absolute', top: 12, left: 8, width: 5, height: 5, borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', top: 12, right: 8, width: 5, height: 5, borderRadius: '50%', background: '#333' }} />
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 14, height: 6, borderRadius: '0 0 10px 10px', border: '2px solid #333', borderTop: 'none' }} />
      </div>
      {/* Jacket */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 44, height: 28, borderRadius: '6px 6px 0 0',
          background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 4,
        }}>
          {/* Bow tie */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <div style={{ width: 7, height: 5, background: '#dc2626', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#dc2626' }} />
            <div style={{ width: 7, height: 5, background: '#dc2626', clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }} />
          </div>
        </div>
        {/* Lapels */}
        <div style={{ position: 'absolute', top: 0, left: 8, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '14px solid #fff' }} />
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
      {CONFETTI_PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: '50%',
            width: 10,
            height: 10,
            borderRadius: p.isCircle ? '50%' : 2,
            background: p.color,
            animation: `confetti${p.animIndex} ${p.duration} ease ${p.delay} both`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
interface ActionButtonProps {
  onClick: () => void;
  color: string;
  label: string;
  icon: string;
}

function ActionButton({ onClick, color, label, icon }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `${color}22`,
        border: `2px solid ${color}66`,
        color,
        borderRadius: 10,
        padding: '12px 24px',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        minWidth: 80,
        transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${color}44`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 6px 20px ${color}44`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `${color}22`;
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13 }}>{label}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BlackjackGameProps {
  onBack: () => void;
}

export default function BlackjackGame({ onBack }: BlackjackGameProps) {
  // Inject animation styles once, safely inside useEffect (never during render)
  useEffect(() => {
    const id = 'bj-animations';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = ANIMATION_STYLES;
    document.head.appendChild(el);
  }, []);

  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [splitHand, setSplitHand] = useState<Card[]>([]);
  const [activeSplit, setActiveSplit] = useState<'main' | 'split'>('main');
  const [phase, setPhase] = useState<Phase>('betting');
  const [bet, setBet] = useState<number>(0);
  const [bankroll, setBankroll] = useState<number>(0);
  const [result, setResult] = useState<Result>(null);
  const [splitResult, setSplitResult] = useState<Result>(null);
  const [isFlippingDealer, setIsFlippingDealer] = useState(false);
  const [chipAnimating, setChipAnimating] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');

  // Shoe lives entirely in a ref — no state needed, never drives rendering
  const shoeRef = useRef<Card[]>(freshShoe());

  const drawCard = (hidden = false): Card => {
    if (shoeRef.current.length < 10) {
      shoeRef.current = freshShoe();
    }
    const raw = shoeRef.current.pop()!;
    return { ...raw, hidden, dealt: true };
  };

  // ── Table selection ────────────────────────────────────────────────────────
  function selectTable(table: TableDef) {
    setSelectedTable(table);
    setBankroll(table.bankroll);
    setBet(0);
    setDealerHand([]);
    setPlayerHand([]);
    setSplitHand([]);
    setResult(null);
    setSplitResult(null);
    setMessage('');
    setPhase('betting');
    setActiveSplit('main');
  }

  // ── Betting ────────────────────────────────────────────────────────────────
  function addChip(value: number) {
    if (bet + value > bankroll) return;
    setBet(b => b + value);
    setChipAnimating(value);
    setTimeout(() => setChipAnimating(null), 350);
  }

  function clearBet() {
    setBet(0);
  }

  // ── Deal ──────────────────────────────────────────────────────────────────
  function deal() {
    const minBet = selectedTable?.minBet ?? 1;
    if (bet < minBet || bet > bankroll) return;
    setBankroll(b => b - bet);
    setSplitHand([]);
    setActiveSplit('main');
    setResult(null);
    setSplitResult(null);
    setMessage('');

    const c1 = drawCard();
    const c2 = drawCard(true); // dealer hidden card
    const c3 = drawCard();
    const c4 = drawCard();

    setDealerHand([c1, c2]);
    setPlayerHand([c3, c4]);
    setPhase('playing');

    // Check immediate player blackjack
    setTimeout(() => {
      if (handScore([c3, c4]) === 21) {
        revealAndSettle([c1, c2], [c3, c4], []);
      }
    }, 800);
  }

  // ── Hit ───────────────────────────────────────────────────────────────────
  function hit() {
    const card = drawCard();
    if (activeSplit === 'main') {
      const newHand = [...playerHand, card];
      setPlayerHand(newHand);
      if (isBust(newHand)) {
        if (splitHand.length > 0) {
          setActiveSplit('split');
        } else {
          revealAndSettle(dealerHand, newHand, splitHand);
        }
      }
    } else {
      const newSplit = [...splitHand, card];
      setSplitHand(newSplit);
      if (isBust(newSplit)) {
        revealAndSettle(dealerHand, playerHand, newSplit);
      }
    }
  }

  // ── Stand ─────────────────────────────────────────────────────────────────
  function stand() {
    if (activeSplit === 'main' && splitHand.length > 0) {
      setActiveSplit('split');
    } else {
      revealAndSettle(dealerHand, playerHand, splitHand);
    }
  }

  // ── Double Down ───────────────────────────────────────────────────────────
  function doubleDown() {
    const extra = Math.min(bet, bankroll);
    setBankroll(b => b - extra);
    setBet(b => b + extra);
    const card = drawCard();
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    revealAndSettle(dealerHand, newHand, splitHand);
  }

  // ── Split ─────────────────────────────────────────────────────────────────
  function splitCards() {
    if (playerHand.length !== 2 || playerHand[0].rank !== playerHand[1].rank) return;
    if (bankroll < bet) return;
    setBankroll(b => b - bet);
    const mainCard = drawCard();
    const splitCard = drawCard();
    setPlayerHand([playerHand[0], mainCard]);
    setSplitHand([playerHand[1], splitCard]);
    setActiveSplit('main');
  }

  // ── Reveal & Settle ───────────────────────────────────────────────────────
  function revealAndSettle(dHand: Card[], pHand: Card[], sHand: Card[]) {
    setPhase('dealer');
    setIsFlippingDealer(true);
    const revealed = dHand.map(c => ({ ...c, hidden: false }));
    setDealerHand(revealed);
    setTimeout(() => {
      setIsFlippingDealer(false);
      dealerPlay(revealed, pHand, sHand);
    }, 400);
  }

  function dealerPlay(dHand: Card[], pHand: Card[], sHand: Card[]) {
    let current = [...dHand];
    const draw = () => {
      if (handScore(current) < 17) {
        const card = drawCard();
        current = [...current, card];
        setDealerHand([...current]);
        setTimeout(draw, 600);
      } else {
        settle(current, pHand, sHand);
      }
    };
    draw();
  }

  function settle(dHand: Card[], pHand: Card[], sHand: Card[]) {
    const dScore = handScore(dHand);
    const pScore = handScore(pHand);
    const dBust  = isBust(dHand);
    const pBust  = isBust(pHand);
    const pBJ    = isBlackjack(pHand);
    const dBJ    = isBlackjack(dHand);

    let payout = 0;
    let res: Result = null;

    if      (pBust)        { res = 'lose';      payout = 0; }
    else if (pBJ && !dBJ)  { res = 'blackjack'; payout = bet + bet * 1.5; }
    else if (dBJ && !pBJ)  { res = 'lose';      payout = 0; }
    else if (dBust)        { res = 'win';        payout = bet * 2; }
    else if (pScore > dScore) { res = 'win';     payout = bet * 2; }
    else if (pScore === dScore) { res = 'push';  payout = bet; }
    else                   { res = 'lose';       payout = 0; }

    let totalPayout = payout;
    let sRes: Result = null;

    if (sHand.length > 0) {
      const sScore = handScore(sHand);
      const sBust  = isBust(sHand);
      if      (sBust)            { sRes = 'lose'; }
      else if (dBust)            { sRes = 'win';  totalPayout += bet * 2; }
      else if (sScore > dScore)  { sRes = 'win';  totalPayout += bet * 2; }
      else if (sScore === dScore){ sRes = 'push'; totalPayout += bet; }
      else                       { sRes = 'lose'; }
      setSplitResult(sRes);
    }

    setBankroll(b => b + totalPayout);
    setResult(res);
    setPhase('result');
    setMessage(res ? RESULT_MESSAGES[res](bet) : '');
  }

  // ── Next Round ────────────────────────────────────────────────────────────
  function nextRound() {
    setPhase('betting');
    setDealerHand([]);
    setPlayerHand([]);
    setSplitHand([]);
    setBet(0);
    setResult(null);
    setSplitResult(null);
    setMessage('');
    setActiveSplit('main');
  }

  function recharge() {
    setSelectedTable(null);
    setDealerHand([]);
    setPlayerHand([]);
    setSplitHand([]);
    setBet(0);
    setResult(null);
    setSplitResult(null);
    setMessage('');
    setPhase('betting');
    setActiveSplit('main');
  }

  // ── Derived values (never useState-mirrored) ───────────────────────────────
  const playerScore  = handScore(playerHand);
  const dealerScore  = handScore(dealerHand.filter(c => !c.hidden));
  const splitScore   = handScore(splitHand);

  const canSplit = phase === 'playing'
    && playerHand.length === 2
    && splitHand.length === 0
    && playerHand[0]?.rank === playerHand[1]?.rank
    && bankroll >= bet;

  const canDouble = phase === 'playing'
    && activeSplit === 'main'
    && playerHand.length === 2
    && splitHand.length === 0
    && bankroll >= bet;

  // ─── Render ────────────────────────────────────────────────────────────────
  const minBet = selectedTable?.minBet ?? 1;
  const activeChips = selectedTable?.chips ?? CHIPS;

  // ── Table selection screen ────────────────────────────────────────────────
  if (!selectedTable) {
    return (
      <div style={{
        minHeight: '100vh',
        background: SURFACE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: TEXT,
      }}>
        {/* Header */}
        <div style={{
          width: '100%', maxWidth: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${BORDER}`,
          background: SURFACE2,
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(168,85,247,0.12)', border: `1px solid ${BORDER}`,
              color: ACCENT, borderRadius: 8, padding: '8px 16px',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.12)')}
          >
            ← Retour
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: TEXT }}>♠ Blackjack</div>
          <div style={{ width: 80 }} />
        </div>

        {/* Table list */}
        <div style={{
          width: '100%', maxWidth: 520,
          padding: '32px 20px',
          display: 'flex', flexDirection: 'column', gap: 0,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🃏</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: 1 }}>Choisir une table</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Sélectionnez vos enjeux pour commencer</div>
          </div>

          {TABLES.map((table, idx) => (
            <button
              key={table.name}
              onClick={() => selectTable(table)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%',
                background: table.highStakes
                  ? 'linear-gradient(135deg, rgba(180,83,9,0.18) 0%, rgba(120,53,15,0.10) 100%)'
                  : 'linear-gradient(135deg, rgba(22,101,52,0.22) 0%, rgba(13,51,24,0.14) 100%)',
                border: table.highStakes
                  ? '1.5px solid rgba(251,191,36,0.35)'
                  : '1.5px solid rgba(34,197,94,0.2)',
                borderRadius: idx === 0 ? '14px 14px 4px 4px' : idx === TABLES.length - 1 ? '4px 4px 14px 14px' : '4px',
                padding: '16px 20px',
                cursor: 'pointer',
                marginBottom: idx === TABLES.length - 1 ? 0 : 2,
                transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
                color: TEXT,
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = table.highStakes
                  ? '0 4px 20px rgba(251,191,36,0.15)'
                  : '0 4px 20px rgba(34,197,94,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: table.highStakes
                    ? 'linear-gradient(135deg, #b45309, #92400e)'
                    : 'linear-gradient(135deg, #16a34a, #15803d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, color: '#fff',
                  boxShadow: table.highStakes ? '0 2px 8px rgba(180,83,9,0.4)' : '0 2px 8px rgba(22,163,74,0.4)',
                  flexShrink: 0,
                }}>
                  {table.highStakes ? '★' : '♠'}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
                    Table {table.name}
                    {table.highStakes && (
                      <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(251,191,36,0.18)', color: '#fbbf24', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                        HIGH STAKES
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                    Mise min. : <span style={{ color: table.highStakes ? '#fbbf24' : '#4ade80', fontWeight: 600 }}>{table.minBet}€</span>
                    <span style={{ marginLeft: 12 }}>
                      Départ : <span style={{ color: TEXT, fontWeight: 600 }}>{table.bankroll.toLocaleString('fr-FR')}€</span>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 20, color: MUTED, opacity: 0.5 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: SURFACE,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: TEXT,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        width: '100%', maxWidth: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${BORDER}`,
        background: SURFACE2,
        position: 'relative', zIndex: 2,
      }}>
        <button
          onClick={recharge}
          style={{
            background: 'rgba(168,85,247,0.12)', border: `1px solid ${BORDER}`,
            color: ACCENT, borderRadius: 8, padding: '8px 16px',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.12)')}
        >
          ← Tables
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: TEXT }}>♠ Blackjack</div>
          <div style={{ fontSize: 11, color: selectedTable.highStakes ? '#fbbf24' : '#4ade80', fontWeight: 600, letterSpacing: 1 }}>
            Table {selectedTable.name} — mise min. {selectedTable.minBet}€
          </div>
        </div>
        <div style={{
          background: 'rgba(168,85,247,0.12)', border: `1px solid ${BORDER}`,
          borderRadius: 10, padding: '8px 18px', fontSize: 16, fontWeight: 700,
        }}>
          <span style={{ color: MUTED, fontSize: 12, display: 'block', lineHeight: 1 }}>Solde</span>
          <span style={{ color: bankroll < minBet * 2 ? '#ef4444' : '#fbbf24' }}>{bankroll.toLocaleString('fr-FR')}€</span>
        </div>
      </div>

      {/* ── Felt Table ── */}
      <div style={{
        width: '100%', maxWidth: 900,
        flex: 1,
        background: 'linear-gradient(135deg, #1a4a2a 0%, #0d3318 100%)',
        backgroundImage: [
          'linear-gradient(135deg, #1a4a2a 0%, #0d3318 100%)',
          'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '100% 100%, 20px 20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 480,
      }}>
        {/* Deck indicator */}
        <div style={{
          position: 'absolute', top: 16, right: 20,
          width: 50, height: 70, borderRadius: 6,
          background: 'linear-gradient(135deg, #1e3a8a, #1e1b4b)',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: MUTED, fontWeight: 600, zIndex: 1,
        }}>
          DECK
        </div>

        {/* ── Dealer Area ── */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <DealerAvatar />
            <div>
              <div style={{ fontSize: 13, color: MUTED, fontWeight: 600, letterSpacing: 1 }}>CROUPIER</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Marcel</div>
              {dealerHand.length > 0 && (
                <div style={{
                  display: 'inline-block', marginTop: 4,
                  background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                  padding: '2px 10px', fontSize: 15, fontWeight: 700,
                  color: dealerScore > 21 ? '#ef4444' : TEXT,
                }}>
                  {dealerScore > 0 ? dealerScore : '?'}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', minHeight: 120 }}>
            {dealerHand.map((card, i) => (
              <PlayingCard
                key={card.id}
                card={card}
                index={i}
                isFlipping={isFlippingDealer && i === 1 && !card.hidden}
              />
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{
          width: '90%', margin: '0 auto', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }} />

        {/* ── Player Area ── */}
        <div
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '16px 20px 24px',
            animation: result === 'win' || result === 'blackjack'
              ? 'winPulse 1s ease 2'
              : result === 'lose'
              ? 'losePulse 0.8s ease 2'
              : undefined,
          }}
        >
          {splitHand.length > 0 ? (
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
              {/* Main hand */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: activeSplit === 'main' ? ACCENT : MUTED, fontWeight: 700, letterSpacing: 1 }}>
                  MAIN 1 {activeSplit === 'main' ? '▶' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {playerHand.map((card, i) => <PlayingCard key={card.id} card={card} index={i} />)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isBust(playerHand) ? '#ef4444' : TEXT }}>
                  {playerScore}{isBust(playerHand) ? ' — Bust' : ''}
                  {result && splitResult && (
                    <span style={{ marginLeft: 8, color: RESULT_COLORS[result] }}>
                      {result === 'win' || result === 'blackjack' ? '+' : result === 'push' ? '=' : '-'}{bet}€
                    </span>
                  )}
                </div>
              </div>

              {/* Split hand */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: activeSplit === 'split' ? ACCENT : MUTED, fontWeight: 700, letterSpacing: 1 }}>
                  MAIN 2 {activeSplit === 'split' ? '▶' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {splitHand.map((card, i) => <PlayingCard key={card.id} card={card} index={i} />)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isBust(splitHand) ? '#ef4444' : TEXT }}>
                  {splitScore}{isBust(splitHand) ? ' — Bust' : ''}
                  {splitResult && (
                    <span style={{ marginLeft: 8, color: RESULT_COLORS[splitResult] }}>
                      {splitResult === 'win' ? '+' : splitResult === 'push' ? '=' : '-'}{bet}€
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', minHeight: 120 }}>
                {playerHand.map((card, i) => (
                  <PlayingCard key={card.id} card={card} index={i} />
                ))}
              </div>
              {playerHand.length > 0 && (
                <div style={{
                  marginTop: 8,
                  display: 'inline-block',
                  background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                  padding: '2px 10px', fontSize: 15, fontWeight: 700,
                  color: playerScore > 21 ? '#ef4444' : TEXT,
                }}>
                  {playerScore}{playerScore > 21 ? ' — Bust' : ''}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 12, fontSize: 13, color: MUTED, fontWeight: 600, letterSpacing: 1 }}>VOUS</div>
        </div>

        {/* ── Result Banner ── */}
        {result && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            animation: 'resultSlide 0.4s ease both',
          }}>
            <div style={{
              background: RESULT_COLORS[result],
              color: '#fff', fontWeight: 800, fontSize: 22,
              padding: '14px 32px', borderRadius: 16,
              boxShadow: `0 0 40px ${RESULT_COLORS[result]}88, 0 4px 24px rgba(0,0,0,0.5)`,
              letterSpacing: 1, textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              {message}
            </div>
          </div>
        )}

        {result === 'blackjack' && <Confetti />}
      </div>

      {/* ── Controls ── */}
      <div style={{
        width: '100%', maxWidth: 900,
        background: SURFACE2,
        borderTop: `1px solid ${BORDER}`,
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Betting phase */}
        {phase === 'betting' && (
          <>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              {activeChips.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => addChip(chip.value)}
                  disabled={bet + chip.value > bankroll}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: chip.color,
                    border: '4px solid rgba(255,255,255,0.25)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 2px rgba(255,255,255,0.08)',
                    color: chip.textColor,
                    fontWeight: 800, fontSize: 13,
                    cursor: bet + chip.value > bankroll ? 'not-allowed' : 'pointer',
                    opacity: bet + chip.value > bankroll ? 0.4 : 1,
                    animation: chipAnimating === chip.value ? 'chipBounce 0.35s ease' : undefined,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => {
                    if (bet + chip.value <= bankroll) {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 2px rgba(255,255,255,0.08)';
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                padding: '8px 20px', border: `1px solid ${BORDER}`,
              }}>
                <span style={{ color: MUTED, fontSize: 12 }}>Mise : </span>
                <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 18 }}>{bet}€</span>
              </div>

              <button
                onClick={clearBet}
                disabled={bet === 0}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', borderRadius: 8, padding: '10px 18px',
                  cursor: bet === 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                  opacity: bet === 0 ? 0.4 : 1,
                }}
              >
                Effacer
              </button>

              <button
                onClick={deal}
                disabled={bet < minBet}
                style={{
                  background: bet >= minBet ? `linear-gradient(135deg, ${ACCENT}, #7c3aed)` : 'rgba(168,85,247,0.2)',
                  border: 'none', color: '#fff', borderRadius: 10,
                  padding: '12px 32px', fontSize: 16, fontWeight: 700,
                  cursor: bet < minBet ? 'not-allowed' : 'pointer',
                  opacity: bet < minBet ? 0.5 : 1,
                  boxShadow: bet >= minBet ? '0 4px 16px rgba(168,85,247,0.4)' : undefined,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => { if (bet >= minBet) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              >
                🃏 Distribuer
              </button>

              {bankroll < minBet && bet === 0 && (
                <button
                  onClick={recharge}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none', color: '#fff', borderRadius: 10,
                    padding: '12px 24px', fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                  }}
                >
                  🔄 Changer de table
                </button>
              )}
            </div>

            {message && (
              <div style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 700, fontSize: 15, animation: 'fadeIn 0.3s ease' }}>
                {message}
              </div>
            )}
          </>
        )}

        {/* Playing phase */}
        {phase === 'playing' && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ActionButton onClick={hit}       color={ACCENT}    label="Tirer"   icon="+" />
            <ActionButton onClick={stand}     color="#10b981"   label="Rester"  icon="✓" />
            {canDouble && <ActionButton onClick={doubleDown} color="#f59e0b" label="Doubler" icon="×2" />}
            {canSplit  && <ActionButton onClick={splitCards} color="#3b82f6" label="Séparer" icon="⇌" />}
          </div>
        )}

        {/* Dealer playing */}
        {phase === 'dealer' && (
          <div style={{ textAlign: 'center', color: MUTED, fontSize: 15, fontWeight: 600, padding: '8px 0' }}>
            Marcel joue…
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={nextRound}
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, #7c3aed)`,
                border: 'none', color: '#fff', borderRadius: 10,
                padding: '12px 36px', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(168,85,247,0.4)',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              Nouvelle partie
            </button>
            {bankroll < minBet && (
              <button
                onClick={recharge}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none', color: '#fff', borderRadius: 10,
                  padding: '12px 24px', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                }}
              >
                🔄 Changer de table
              </button>
            )}
          </div>
        )}

        {/* Current bet indicator */}
        {(phase === 'playing' || phase === 'dealer' || phase === 'result') && (
          <div style={{ textAlign: 'center', color: MUTED, fontSize: 13 }}>
            Mise en cours : <span style={{ color: '#fbbf24', fontWeight: 700 }}>{bet}€</span>
            {splitHand.length > 0 && (
              <span style={{ color: MUTED }}>
                {' '}+ <span style={{ color: '#fbbf24', fontWeight: 700 }}>{bet}€</span> (split)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
