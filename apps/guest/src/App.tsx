import { useMemo } from 'react'
import { usePortalConfig } from './usePortalConfig'

export type GuestTab = 'home' | 'menu' | 'order' | 'games' | 'account' | 'feedback'

function buildPortalUrl(tableNumber?: string) {
  const configured = import.meta.env.VITE_WEB_CLIENT_URL as string | undefined
  const fallback =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:5174`
      : 'http://127.0.0.1:5174'
  const base = (configured || fallback).replace(/\/$/, '')
  const url = new URL('/c', base)
  url.searchParams.set('table', tableNumber || '1')
  return url.toString()
}

export default function App() {
  const { config } = usePortalConfig(2500)
  const accent = config?.accentColor || '#a855f7'
  const tableNumber = config?.tableNumber || '1'
  const portalUrl = useMemo(() => buildPortalUrl(tableNumber), [tableNumber])

  return (
    <main className="guest-stage guest-stage-unified" style={{ ['--guest-accent' as string]: accent }}>
      <section className="guest-device guest-device-unified" aria-label="Portail client Creorga">
        <div className="guest-shell guest-shell-unified">
          <div className="guest-unified-topbar">
            <div>
              <strong>Creorga Client</strong>
              <span>Table {tableNumber}</span>
            </div>
            <a href={portalUrl} target="_blank" rel="noreferrer">
              Ouvrir
            </a>
          </div>
          <iframe
            title="Portail client Creorga 4.0.0"
            src={portalUrl}
            className="guest-unified-frame"
            allow="clipboard-write; fullscreen"
          />
        </div>
      </section>
    </main>
  )
}
