import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import stations from './radio-stations.json'

/**
 * Music & Radio module — 4 tabs : Radio · Spotify · YouTube · Apple Music
 * Radio uses HTML5 <audio> with curated streams (FR/LU/BE/PT/BR/DE/ES/EN).
 * Streaming services use public iframe embeds (no API key required).
 */

interface Station {
  id: string
  name: string
  country: string
  lang: string
  genre: string
  stream: string
}

type Tab = 'radio' | 'spotify' | 'youtube' | 'apple'

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷', LU: '🇱🇺', BE: '🇧🇪', PT: '🇵🇹', BR: '🇧🇷',
  DE: '🇩🇪', ES: '🇪🇸', GB: '🇬🇧', US: '🇺🇸',
}

export default function MusicPage() {
  const [tab, setTab] = useState<Tab>('radio')
  const [current, setCurrent] = useState<Station | null>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const allStations = stations as Station[]

  const countries = useMemo(() => Array.from(new Set(allStations.map((s) => s.country))), [allStations])
  const genres = useMemo(() => Array.from(new Set(allStations.map((s) => s.genre))), [allStations])

  const filtered = useMemo(() => {
    return allStations.filter((s) => {
      if (filter !== 'all' && s.country !== filter && s.genre !== filter && s.lang !== filter) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [allStations, filter, search])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const playStation = async (s: Station) => {
    setCurrent(s)
    if (audioRef.current) {
      audioRef.current.src = s.stream
      try { await audioRef.current.play(); setPlaying(true) }
      catch (e) { console.error('Play error', e); setPlaying(false) }
    }
  }
  const togglePlay = async () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { try { await audioRef.current.play(); setPlaying(true) } catch {} }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#0f172a' }}>
          🎵 Musique & Radio
        </h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
          Radio en streaming · Spotify · YouTube · Apple Music — pour l'ambiance de votre salle
        </p>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16, padding: 4,
        background: '#f1f5f9', borderRadius: 10, width: 'fit-content',
      }}>
        {(['radio', 'spotify', 'youtube', 'apple'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
            color: tab === t ? '#fff' : '#475569', fontWeight: 700, fontSize: 13,
          }}>
            {t === 'radio' ? '📻 Radio' : t === 'spotify' ? '🎵 Spotify' : t === 'youtube' ? '🎬 YouTube' : '🍎 Apple Music'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'radio' && (
          <motion.div key="radio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <input
                placeholder="🔎 Rechercher une station…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: '1 1 220px', minWidth: 180, padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', fontSize: 13,
                }} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, cursor: 'pointer' }}>
                <option value="all">Tous les pays</option>
                {countries.map((c) => <option key={c} value={c}>{COUNTRY_FLAGS[c] || ''} {c}</option>)}
                <optgroup label="Genres">
                  {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </optgroup>
              </select>
              <span style={{ alignSelf: 'center', color: '#64748b', fontSize: 12 }}>
                {filtered.length} station(s)
              </span>
            </div>

            {/* Stations grid */}
            <div style={{
              display: 'grid', gap: 8,
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            }}>
              {filtered.map((s) => {
                const isCurrent = current?.id === s.id
                return (
                  <button key={s.id} onClick={() => playStation(s)}
                    style={{
                      padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      background: isCurrent ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
                      color: isCurrent ? '#fff' : '#1e293b',
                      border: isCurrent ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      transition: 'all .15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{COUNTRY_FLAGS[s.country] || '📻'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{s.genre}</div>
                      </div>
                      {isCurrent && <span style={{ fontSize: 16 }}>{playing ? '🔊' : '⏸'}</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Sticky player */}
            {current && (
              <motion.div
                initial={{ y: 100 }} animate={{ y: 0 }}
                style={{
                  position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                  width: '90%', maxWidth: 700, padding: 14,
                  background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(14px)',
                  borderRadius: 16, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.3)', zIndex: 100,
                }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: 'linear-gradient(135deg,#6366f1,#ec4899)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, animation: playing ? 'pulse 2s infinite' : 'none',
                }}>{COUNTRY_FLAGS[current.country] || '📻'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{current.name}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>{current.genre} · {current.country}</div>
                </div>
                <button onClick={togglePlay} style={{
                  width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: '#fff', color: '#1e293b', fontSize: 20,
                }}>{playing ? '⏸' : '▶'}</button>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={(e) => setVolume(+e.target.value)}
                  style={{ width: 120, accentColor: '#6366f1' }} />
              </motion.div>
            )}
            <audio ref={audioRef} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
          </motion.div>
        )}

        {tab === 'spotify' && (
          <motion.div key="spotify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ServiceFrame
              title="🎵 Spotify Web Player"
              src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0"
              note="Connectez-vous à votre compte Spotify pour accéder à vos playlists. Cette page intègre le lecteur Web officiel."
              openUrl="https://open.spotify.com"
            />
          </motion.div>
        )}

        {tab === 'youtube' && (
          <motion.div key="youtube" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ServiceFrame
              title="🎬 YouTube"
              src="https://www.youtube.com/embed/?listType=search&list=lounge+restaurant+jazz"
              note="Chaîne lounge / jazz par défaut. Modifiez l'URL ou ouvrez YouTube directement pour une playlist personnalisée."
              openUrl="https://www.youtube.com"
            />
          </motion.div>
        )}

        {tab === 'apple' && (
          <motion.div key="apple" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ServiceFrame
              title="🍎 Apple Music"
              src="https://embed.music.apple.com/fr/playlist/today-s-hits/pl.f4d106fed2bd41149aaacabb233eb5eb"
              note="Lecteur web Apple Music — connexion Apple ID requise pour la lecture intégrale."
              openUrl="https://music.apple.com"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.7;} }`}</style>
    </div>
  )
}

function ServiceFrame({ title, src, note, openUrl }: { title: string; src: string; note: string; openUrl: string }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{note}</div>
        </div>
        <a href={openUrl} target="_blank" rel="noreferrer" style={{
          padding: '8px 14px', borderRadius: 8, background: '#6366f1', color: '#fff',
          textDecoration: 'none', fontWeight: 700, fontSize: 12,
        }}>Ouvrir ↗</a>
      </div>
      <iframe
        src={src}
        title={title}
        style={{
          width: '100%', height: 480, border: 'none',
          borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
        loading="lazy"
      />
    </div>
  )
}
