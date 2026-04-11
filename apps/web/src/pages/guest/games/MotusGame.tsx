import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Word List (500+ French 5-letter words) ───────────────────────────────────

const WORDS: string[] = [
  'ABCES','ABIME','ABOIS','ABOLI','ABORD','ABRIS','ABYME','ACCES','ACHAT','ACIDE',
  'ACTES','ACTIF','ADAGE','ADMET','ADORE','ADULE','AERER','AGACE','AGAVE','AGIOS',
  'AGITE','AGORA','AIGRE','AIOLI','ALLOT','ALOES','ALORS','ALTER','AMANT','AMBRE',
  'AMENE','AMERS','AMIBE','AMIES','AMOUR','AMPLE','AMUSE','ANCRE','ANGES','ANGLE',
  'ANIME','ANISE','AOUTE','AORTE','APERO','APOGE','APPAT','APPEL','APPUI','APRES',
  'ARBRE','ARCHE','ARIDE','ARMES','AROME','ARRET','ASILE','ASTRO','ATOME','ATONE',
  'ATOUT','AUDIT','AUSSI','AVALE','AVANT','AVARE','AVIDE','AVION','AVOIR','AVOUE',
  'BAGNE','BAIES','BAISE','BALLE','BANDE','BANJO','BARBU','BARGE','BARON','BARRE',
  'BASIC','BASIL','BATTU','BAUGE','BAVER','BELLE','BETES','BETON','BIDON','BILLE',
  'BLANC','BLASE','BLEUS','BOCAL','BOIRE','BOMBE','BORDE','BOUGE','BOULE','BRAVO',
  'BRISE','BRUME','BUCHE','BULLE','CABLE','CACHE','CADET','CADRE','CAFES','CALME',
  'CAMEL','CANAL','CARRE','CARTE','CASTE','CAUSE','CERFS','CHANT','CHAOS','CHAUD',
  'CHENE','CHUTE','CIBLE','CITER','CLAIR','CLAME','CLORE','COEUR','COLLE','CONGE',
  'CONTE','COUPE','COURT','CRANE','CRETE','CREUX','CRIME','CRUEL','CUIRE','CYCLE',
  'DAMES','DENTS','DEPOT','DERME','DESIR','DETTE','DEUIL','DEVIN','DIETE','DOLCE',
  'DOUTE','DROIT','DUVET','ECART','ECHEC','ECRAN','EFFET','ELOGE','EMAIL','ENCRE',
  'ENFER','ENVIE','ENVOL','EPAIS','EPAVE','EPICE','EPOUX','ERRER','ESSOR','ETAGE',
  'ETAIN','ETANG','ETAPE','ETUDE','EVADE','EXACT','FACET','FIXER','FLIRT','FOIRE',
  'FOLIE','FORCE','FORGE','FORME','FOYER','FRANC','FRONT','FUGUE','FURET','FUSEE',
  'GARDE','GENRE','GILET','GIVRE','GLACE','GLANE','GLOBE','GRACE','GRADE','GRAIN',
  'GRAVE','GREVE','GRISE','GROIN','GUIDE','GUISE','HABIT','HACHE','HALTE','HAREM',
  'HAVRE','HEURE','HIVER','HOMME','HOTEL','IMAGE','IMPOT','INTER','JOUER','JUGER',
  'KARMA','LAPIN','LAVER','LENTE','LIEGE','LIGNE','LINGE','LIVRE','LOCAL','LOQUE',
  'LOTUS','LOUER','LOUPE','LUTTE','MAGOT','MALIN','MANIE','MARGE','MASSE','MATCH',
  'MENER','MERCI','METEO','MIEUX','MIXTE','MONDE','MORSE','MOTTE','MOULE','MULET',
  'NAPPE','NETTE','NOBLE','NOUER','OBESE','OBJET','OBOLE','ODEUR','OLIVE','ONGLE',
  'OPERE','ORAGE','ORGUE','ORNER','OSIER','OZONE','PACTE','PAIRE','PALET','PALME',
  'PANSE','PAROI','PATTE','PAUSE','PAVOT','PERDU','PERLE','PERSE','PESTE','PHARE',
  'PIECE','PIEGE','PINCE','PITRE','PIXEL','PLANE','PLIER','PLOMB','PLUME','POCHE',
  'POEME','POMME','POUCE','PRISE','PRUNE','PURGE','QUEUE','RASER','REBUT','RECIT',
  'REFUS','REGAL','REINE','REPOS','RESTE','RIDER','RINCE','RIVAL','ROBOT','ROTIN',
  'ROUGE','SABLE','SABOT','SAPIN','SCORE','SERRE','SIROP','SOBRE','SOEUR','SOLDE',
  'SOMME','SORTE','SOUCI','SOUPE','SOURD','SPORT','STYLE','SUJET','SUPER','TALUS',
  'TAPIS','TAUPE','TAXER','TEINT','TENTE','TERME','TERRE','TIMON','TITRE','TOILE',
  'TOMBE','TORDU','TOTEM','TRAIN','TREVE','TRIER','TRIPE','TRONE','TROUS','TUEUR',
  'ULTRA','UNION','USURE','UTILE','VALVE','VARIE','VASTE','VENIN','VERSE','VESTE',
  'VITRE','VOGUE','VOTER','VOUER','VOYOU','WAGON','ZESTE','ZEBRE','ABORD','ACONS',
  'AGONI','AGRES','AIRAS','AIRER','ALORS','AMATI','AMIDE','AMIGO','AMIRE','AMPUT',
  'APURE','ARDRE','ARIEL','AROBE','ARRON','ARSIC','ARTEL','ASCOT','ASPLE','ASSIT',
  'ATTAR','AURAL','AUTOM','BEFOI','BOCAL','BOTOX','CABLE','CAHIN','CENDR','CHAIM',
  'COMPA','COMPT','CRANE','CRIRE','CROIS','CYTOM','DANCE','DIVID','DOMME','EDICT',
  'EMPLI','EXPLO','FADER','FAINE','GONZE','GRANT','GUERE','GUSTO','HARCH','IMBER',
  'INDES','INDIE','INERT','INFAM','INFUS','INONU','IRATE','JOYET','LOFER','LYRIQ',
  'MAGOT','MANUE','MAPPE','MASON','MENUS','MIETE','MIGUE','MONST','MOUSSE','NIOUE',
  'NITRO','OFICE','ORDON','PANEN','PARCE','POUDR','PUBLI','RADER','RAPOR','REFUS',
  'RELOU','RENOM','REJET','RIGOL','RIFAI','SPORT','SHAME','SOUCI','SOUTE','TARIF',
  'TARER','THYME','TOUFU','TREME','TUTEU','VALOR','VAPOR','VIVID','YOKEL','ZESTE',
  'ABCDE','ABSOL','ACEON','ACIER','ACLAM','ACOIN','ACOMP','ACONS','ACOOL','ACOUP',
  'ADAIG','ADHER','ADMET','ADMIT','ADMOD','ADOPT','ADROI','ADUIS','AEONS','AERER',
  'AGILE','AGIOS','AGONE','AGOUR','AGREG','AIDER','AIGLE','AIMER','AINOL','AIRAN',
  'ALCOO','ALGUE','ALITE','ALLEZ','ALLIE','ALLOW','ALLUS','ALOFE','ALPER','ALTAI',
  'ALTAR','ALTRE','ALUES','ALUNS','ALVES','AMACE','AMALE','AMBLE','AMDAL','AMERS',
  'AMIBE','AMINO','AMIRE','AMORT','AMPHI','AMPLE','AMURE','ANCRA','ANDIN','ANDOR',
  'ANELE','ANETH','ANIME','ANIER','ANION','ANSES','ANTIS','APODE','APURE','ARCAN',
  'ARCOT','ARDOI','ARDOR','AREIC','ARENE','AREON','ARGOT','ARIEL','ARILA','ARILS',
  'AROIN','AROME','ARPES','ARRAS','ARRON','ARSIN','ARTIS','ATOUT','ATTAR','ATTIT',
  'ATTON','ATURE','AUGET','AUNAL','AUNEE','AUNES','AUPAR','AURIF','AURIS','AVENU',
  'AVERS','AVIDE','AVINE','AVION','AVISO','AVIVE','AVOIR','AXANT','AXELS','AXIAL',
  'BABIL','BACUL','BADIN','BAFFE','BAFFE','BAGNE','BAGOU','BAGUE','BAIES','BALAN',
  'BALSA','BANAL','BANDE','BANON','BANQU','BARBE','BARCE','BARDY','BAROA','BARON',
  'BAROS','BARRE','BARRI','BASIE','BASIS','BASTE','BATEE','BATIN','BATTU','BAUME',
  'BEAUT','BECOT','BEFFE','BELGE','BELLA','BELON','BENAL','BENIE','BENIS','BENOU',
  'BERGE','BERIL','BERME','BERNE','BERYL','BESON','BETAN','BETER','BETON','BIDEL',
  'BIDER','BIDON','BIGUE','BILAN','BINER','BISON','BISSE','BITOR','BITUM','BIVAC',
  'BIZER','BLAIN','BLAME','BLAND','BLASE','BLEUS','BLIER','BLOCS','BLOND','BOEUF',
  'BOGGY','BOGIE','BOIRA','BOISE','BOLAR','BONIF','BONZE','BORAX','BORCE','BORDE',
  'BORIE','BORIN','BOSON','BOTOX','BOTTÉ','BOUDE','BOUEE','BOUFI','BOUIL','BOUIN',
  'BOULE','BOVIN','BOYAU','BRAIL','BRAIS','BRAME','BRANE','BRANS','BRASS','BRAVE',
  'BRISE','BRISS','BRIZE','BROKE','BROME','BROUE','BROUT','BRUME','BRUNE','BRUNI',
  'BRUNS','BRUTE','BUBON','BUEES','BURIN','BURON','CABLE','CABRI','CACOU','CADIX',
  'CAFRE','CAGOT','CAHOT','CAIEU','CAIMO','CAIUS','CAJOU','CALAS','CALOT','CALOU',
  'CALVA','CAME','CAMEL','CAMPE','CANON','CANTE','CAPRI','CAPTE','CAQUE','CARAC',
  'CARAS','CARAT','CARIB','CARON','CARRE','CARRY','CARTE','CASAL','CASE','CASOT',
]

// Remove duplicates and ensure uppercase, filter to exactly 5 chars
const WORD_LIST = Array.from(new Set(WORDS.filter(w => w.length === 5)))

// ─── Types ────────────────────────────────────────────────────────────────────

type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'input'
type GameMode = 'daily' | 'random'

interface TileData {
  letter: string
  state: LetterState
  animating: boolean
}

interface DistEntry { attempts: number; count: number }

interface Stats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  distribution: DistEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDailyWord(): string {
  const base = new Date('2024-01-01').getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const idx = Math.floor((today - base) / 86400000) % WORD_LIST.length
  return WORD_LIST[Math.abs(idx)]
}

function getRandomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]
}

function evaluate(word: string, guess: string): LetterState[] {
  const result: LetterState[] = Array(5).fill('absent')
  const available = [...word]
  for (let i = 0; i < 5; i++) {
    if (guess[i] === word[i]) { result[i] = 'correct'; available[i] = ' ' }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue
    const j = available.indexOf(guess[i])
    if (j !== -1) { result[i] = 'present'; available[j] = ' ' }
  }
  return result
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem('motus_stats_v2')
    if (raw) return JSON.parse(raw) as Stats
  } catch { /* ignore */ }
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [] }
}

function saveStats(s: Stats) {
  try { localStorage.setItem('motus_stats_v2', JSON.stringify(s)) } catch { /* ignore */ }
}

function buildShareText(_word: string, rows: TileData[][], won: boolean): string {
  const map: Record<LetterState, string> = {
    correct: '🟥', present: '🟨', absent: '⬛', empty: '⬛', input: '⬛'
  }
  const header = `Motus ${new Date().toLocaleDateString('fr-FR')} ${won ? rows.length : 'X'}/6\n\n`
  return header + rows.map(row => row.map(t => map[t.state]).join('')).join('\n')
}

// ─── AZERTY Keyboard ──────────────────────────────────────────────────────────

const AZERTY_ROWS = [
  ['A','Z','E','R','T','Y','U','I','O','P'],
  ['Q','S','D','F','G','H','J','K','L','M'],
  ['W','X','C','V','B','N'],
]

// ─── Tile Component ───────────────────────────────────────────────────────────

function Tile({ letter, state, flipDelay, animating }: {
  letter: string; state: LetterState; flipDelay: number; animating: boolean
}) {
  const colors: Record<LetterState, { bg: string; border: string; color: string }> = {
    correct: { bg: '#dc2626', border: '#b91c1c', color: '#fff' },
    present: { bg: '#ca8a04', border: '#a16207', color: '#fff' },
    absent:  { bg: '#2a2a3e', border: '#3a3a5c', color: MUTED },
    empty:   { bg: 'transparent', border: BORDER, color: 'transparent' },
    input:   { bg: '#1e1e38', border: '#a855f7', color: TEXT },
  }
  const c = colors[state]

  return (
    <div style={{
      width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: 22, border: `2px solid ${c.border}`,
      background: c.bg, color: c.color, borderRadius: 6,
      animation: animating
        ? `motus-flip 0.5s ease ${flipDelay}ms both`
        : letter && state === 'input'
          ? 'motus-pop 0.1s ease'
          : 'none',
      transition: animating ? 'none' : 'background 0.2s, border-color 0.2s',
    }}>
      {letter}
    </div>
  )
}

// ─── Key Component ────────────────────────────────────────────────────────────

function Key({ label, state, onClick, wide }: {
  label: string; state?: LetterState; onClick: () => void; wide?: boolean
}) {
  const stateColors: Partial<Record<LetterState, string>> = {
    correct: '#dc2626', present: '#ca8a04', absent: '#1e1e38',
  }
  const bg = state ? (stateColors[state] ?? SURFACE2) : SURFACE2
  const color = state === 'absent' ? MUTED : TEXT

  return (
    <button
      onClick={onClick}
      style={{
        minWidth: wide ? 56 : 32, height: 44, padding: '0 4px',
        background: bg, color, border: `1px solid ${BORDER}`,
        borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {label}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MotusGame({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<GameMode>('daily')
  const [word, setWord] = useState<string>(() => getDailyWord())
  const [committed, setCommitted] = useState<TileData[][]>([])   // submitted rows
  const [current, setCurrent] = useState<string>('')              // current input
  const [gameOver, setGameOver] = useState<'won' | 'lost' | null>(null)
  const [shake, setShake] = useState(false)
  const [flippingRow, setFlippingRow] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats>(loadStats)
  const [showStats, setShowStats] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [invalidMsg, setInvalidMsg] = useState('')
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (gameOver) return
      if (e.key === 'Enter') { handleSubmit(); return }
      if (e.key === 'Backspace') { setCurrent(c => c.slice(0, -1)); return }
      const ch = e.key.toUpperCase()
      if (/^[A-Z]$/.test(ch)) addLetter(ch)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }) // no deps — intentional to always capture latest state

  const addLetter = useCallback((ch: string) => {
    setCurrent(c => c.length < 5 ? c + ch : c)
  }, [])

  const handleSubmit = useCallback(() => {
    if (current.length !== 5 || gameOver) return
    if (!WORD_LIST.includes(current)) {
      setInvalidMsg('Mot inconnu')
      setShake(true)
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
      shakeTimer.current = setTimeout(() => { setShake(false); setInvalidMsg('') }, 600)
      return
    }

    const states = evaluate(word, current)
    const newRow: TileData[] = Array.from({ length: 5 }, (_, i) => ({
      letter: current[i],
      state: states[i],
      animating: true,
    }))

    const rowIndex = committed.length
    setFlippingRow(rowIndex)
    setCommitted(prev => [...prev, newRow])
    setCurrent('')

    // Stop flip animation flag after tiles finish
    setTimeout(() => {
      setFlippingRow(null)
      setCommitted(prev => prev.map((r, ri) =>
        ri === rowIndex ? r.map(t => ({ ...t, animating: false })) : r
      ))
    }, 500 + 5 * 100 + 100)

    const won = current === word
    const newCount = committed.length + 1

    if (won || newCount >= 6) {
      const oldStats = loadStats()
      const newStreak = won ? oldStats.currentStreak + 1 : 0
      const dist = [...oldStats.distribution]
      if (won) {
        const entry = dist.find(d => d.attempts === newCount)
        if (entry) entry.count += 1
        else dist.push({ attempts: newCount, count: 1 })
        dist.sort((a, b) => a.attempts - b.attempts)
      }
      const newStats: Stats = {
        played: oldStats.played + 1,
        wins: won ? oldStats.wins + 1 : oldStats.wins,
        currentStreak: newStreak,
        maxStreak: Math.max(oldStats.maxStreak, newStreak),
        distribution: dist,
      }
      saveStats(newStats)
      setStats(newStats)
      setTimeout(() => {
        setGameOver(won ? 'won' : 'lost')
        if (mode === 'daily') setShowStats(true)
      }, 600 + 5 * 100)
    }
  }, [current, gameOver, committed, word, mode])

  const resetGame = useCallback((newMode?: GameMode) => {
    const m = newMode ?? mode
    setMode(m)
    setWord(m === 'daily' ? getDailyWord() : getRandomWord())
    setCommitted([])
    setCurrent('')
    setGameOver(null)
    setFlippingRow(null)
    setShowStats(false)
    setShareMsg('')
  }, [mode])

  // Build letter state map for keyboard
  const letterMap: Record<string, LetterState> = {}
  committed.forEach(row => {
    row.forEach(({ letter, state }) => {
      const prev = letterMap[letter]
      if (!prev || state === 'correct' || (state === 'present' && prev === 'absent')) {
        letterMap[letter] = state
      }
    })
  })

  // Build all rows for display
  const totalRows = 6
  const allRows: TileData[][] = committed.map((row, ri) =>
    row.map(t => ({
      ...t,
      animating: ri === flippingRow,
    }))
  )
  // Current input row
  if (!gameOver && committed.length < totalRows) {
    allRows.push(Array.from({ length: 5 }, (_, i) => ({
      letter: current[i] ?? '',
      state: current[i] ? 'input' : 'empty',
      animating: false,
    })))
  }
  // Empty rows
  while (allRows.length < totalRows) {
    allRows.push(Array.from({ length: 5 }, () => ({ letter: '', state: 'empty', animating: false })))
  }

  const handleShare = () => {
    const text = buildShareText(word, committed, gameOver === 'won')
    navigator.clipboard.writeText(text).then(() => {
      setShareMsg('Copié !')
      setTimeout(() => setShareMsg(''), 2000)
    }).catch(() => setShareMsg('Erreur'))
  }

  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0
  const maxDist = stats.distribution.reduce((m, d) => Math.max(m, d.count), 1)

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes motus-flip {
          0%   { transform: rotateX(0deg); }
          50%  { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes motus-pop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes motus-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
      `}</style>

      <div style={{ color: TEXT, maxWidth: 400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <span style={{ fontWeight: 700, fontSize: 15 }}>📝 Motus</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowStats(s => !s)}
              style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}
            >
              Stats
            </button>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['daily','random'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => resetGame(m)}
              style={{
                flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${mode === m ? '#a855f7' : BORDER}`,
                background: mode === m ? 'rgba(168,85,247,0.2)' : SURFACE2,
                color: mode === m ? '#a855f7' : MUTED,
              }}
            >
              {m === 'daily' ? '📅 Quotidien' : '🎲 Aléatoire'}
            </button>
          ))}
        </div>

        {/* Stats panel */}
        {showStats && (
          <div style={{
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: 16, marginBottom: 14,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 10, textAlign: 'center', fontSize: 14 }}>Statistiques</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 14 }}>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: '#a855f7' }}>{stats.played}</div><div style={{ color: MUTED, fontSize: 10 }}>Joués</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e' }}>{winRate}%</div><div style={{ color: MUTED, fontSize: 10 }}>Victoires</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: '#06b6d4' }}>{stats.currentStreak}</div><div style={{ color: MUTED, fontSize: 10 }}>Série</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 900, color: '#facc15' }}>{stats.maxStreak}</div><div style={{ color: MUTED, fontSize: 10 }}>Max série</div></div>
            </div>
            {stats.distribution.length > 0 && (
              <div>
                <div style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>Distribution :</div>
                {stats.distribution.map(d => (
                  <div key={d.attempts} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: MUTED, fontSize: 12, width: 12, textAlign: 'right' }}>{d.attempts}</span>
                    <div style={{
                      height: 18, borderRadius: 3, background: '#dc2626',
                      width: `${Math.max(8, (d.count / maxDist) * 160)}px`,
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4,
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>{d.count}</div>
                  </div>
                ))}
              </div>
            )}
            {gameOver && (
              <button
                onClick={handleShare}
                style={{
                  width: '100%', marginTop: 12, padding: '8px 0',
                  background: '#dc2626', color: '#fff', border: 'none',
                  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                {shareMsg || '🔗 Partager'}
              </button>
            )}
          </div>
        )}

        {/* Invalid word message */}
        {invalidMsg && (
          <div style={{
            textAlign: 'center', padding: '6px 12px', borderRadius: 8, marginBottom: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 13, fontWeight: 600,
          }}>{invalidMsg}</div>
        )}

        {/* Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginBottom: 16 }}>
          {allRows.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex', gap: 6,
                animation: shake && ri === committed.length ? 'motus-shake 0.5s ease' : 'none',
              }}
            >
              {row.map((tile, ci) => (
                <Tile
                  key={ci}
                  letter={tile.letter}
                  state={tile.state}
                  flipDelay={tile.animating ? ci * 100 : 0}
                  animating={tile.animating}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Result banner */}
        {gameOver && (
          <div style={{
            textAlign: 'center', padding: '12px 16px', borderRadius: 12, marginBottom: 14,
            background: gameOver === 'won' ? 'rgba(220,38,38,0.1)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${gameOver === 'won' ? 'rgba(220,38,38,0.4)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {gameOver === 'won' ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>🎉 Bravo !</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
                  Trouvé en {committed.length} essai{committed.length > 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>😞 Raté !</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Le mot était : <strong style={{ color: TEXT }}>{word}</strong></div>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
              <button
                onClick={handleShare}
                style={{
                  padding: '7px 14px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                {shareMsg || '🔗 Partager'}
              </button>
              {mode === 'random' && (
                <button
                  onClick={() => resetGame('random')}
                  style={{
                    padding: '7px 14px', background: '#a855f7', color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Rejouer
                </button>
              )}
            </div>
          </div>
        )}

        {/* AZERTY Keyboard */}
        {!gameOver && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
            {AZERTY_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 4 }}>
                {row.map(letter => (
                  <Key
                    key={letter}
                    label={letter}
                    state={letterMap[letter]}
                    onClick={() => addLetter(letter)}
                  />
                ))}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <Key label="⌫" onClick={() => setCurrent(c => c.slice(0, -1))} wide />
              <Key label="Entrer" onClick={handleSubmit} wide />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
