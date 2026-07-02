import { useMemo, useState } from 'react'
import { usePortalConfig } from '../usePortalConfig'

function buildGamesUrl(tableNumber?: string) {
  const configured = (import.meta as any).env?.VITE_WEB_CLIENT_URL
  const base = configured || (() => {
    const url = new URL(window.location.href)
    url.port = '5174'
    return url.origin
  })()
  const url = new URL('/c', base)
  url.searchParams.set('table', tableNumber || '1')
  url.searchParams.set('embed', 'games')
  return url.toString()
}

export default function GamesPage() {
  const { config } = usePortalConfig(2500)
  const [loaded, setLoaded] = useState(false)
  const accent = config?.accentColor || '#a855f7'
  const gamesUrl = useMemo(() => buildGamesUrl(config?.tableNumber), [config?.tableNumber])

  return (
    <div style={pageStyle}>
      <div style={topStyle}>
        <div>
          <p style={eyebrowStyle}>Creorga 4.0.0</p>
          <h1 style={titleStyle}>Bibliotheque jeux</h1>
        </div>
        <a href={gamesUrl} target="_blank" rel="noreferrer" style={{ ...openStyle, background: accent }}>
          Ouvrir
        </a>
      </div>

      <div style={frameWrapStyle}>
        {!loaded && (
          <div style={loadingStyle}>
            <span style={{ ...pulseStyle, background: accent }} />
            <strong>Chargement des jeux...</strong>
          </div>
        )}
        <iframe
          title="Bibliotheque jeux Creorga"
          src={gamesUrl}
          onLoad={() => setLoaded(true)}
          style={frameStyle}
          allow="clipboard-write; fullscreen"
        />
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100%',
  padding: 12,
  background: 'linear-gradient(180deg, #05050f 0%, #111127 100%)',
  color: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const topStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
}

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#94a3b8',
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  fontWeight: 950,
}

const openStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  color: '#fff',
  padding: '10px 12px',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 950,
  boxShadow: '0 10px 24px rgba(168,85,247,0.25)',
}

const frameWrapStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 620,
  borderRadius: 18,
  overflow: 'hidden',
  border: '1px solid rgba(168,85,247,0.22)',
  background: '#05050f',
}

const loadingStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  gap: 10,
  color: '#f8fafc',
  zIndex: 1,
}

const pulseStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  boxShadow: '0 0 28px rgba(168,85,247,0.45)',
}

const frameStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  width: '100%',
  height: '100%',
  minHeight: 620,
  border: 0,
  background: '#05050f',
}
