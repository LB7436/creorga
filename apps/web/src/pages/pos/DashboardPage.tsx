import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, ShoppingCart, Euro, TrendingUp, TrendingDown, Sparkles, RefreshCw, AlertTriangle, Flame,
  type LucideIcon,
} from 'lucide-react'
import { useTodayStats, useWeekStats, useTopProductsToday } from '@/hooks/api/useStats'

/**
 * Tableau de bord POS — sur données RÉELLES.
 *
 * L'ancienne version (529 lignes) affichait un CA du jour de 2 430 €, 8/12
 * tables occupées, un top 5 et un flux d'événements « en direct » — tous
 * inventés, sans un seul appel réseau. C'était le premier écran qu'un
 * utilisateur voyait en ouvrant « Caisse POS » (constat critique de l'audit,
 * confirmé par contre-vérification).
 *
 * Désormais : /stats/today, /stats/week et /stats/products/top, avec trois
 * états distincts (chargement, erreur avec Réessayer, vide honnête). Le
 * « vs hier » n'est affiché que si le point d'hier existe dans la semaine ;
 * on ne fabrique jamais une comparaison.
 */

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const fmtEntier = (n: number) => new Intl.NumberFormat('fr-LU', { maximumFractionDigits: 0 }).format(n)

function dateISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */

function Variation({ actuel, precedent }: { actuel: number; precedent: number | null }) {
  if (precedent === null || precedent === 0) {
    return <span style={{ fontSize: 12, color: '#94a3b8' }}>pas de point de comparaison</span>
  }
  const pct = ((actuel - precedent) / precedent) * 100
  const positif = pct >= 0
  const Icone = positif ? TrendingUp : TrendingDown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: positif ? '#10b981' : '#ef4444', fontWeight: 600 }}>
      <Icone size={13} /> {positif ? '+' : ''}{pct.toFixed(0)} % <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs hier</span>
    </span>
  )
}

function CarteKpi({
  titre, valeur, sousTitre, icone: Icone, couleur, enAvant,
}: {
  titre: string
  valeur: string
  sousTitre?: React.ReactNode
  icone: LucideIcon
  couleur: string
  enAvant?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: enAvant ? `linear-gradient(135deg, ${couleur}22, ${couleur}08)` : '#fff',
        border: `1px solid ${enAvant ? couleur + '55' : '#e2e8f0'}`,
        borderRadius: 16, padding: 20, minHeight: 124,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{titre}</span>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: `${couleur}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone size={17} color={couleur} />
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 8 }}>{valeur}</div>
      {sousTitre && <div style={{ marginTop: 6 }}>{sousTitre}</div>}
    </motion.div>
  )
}

function Squelette({ hauteur = 124 }: { hauteur?: number }) {
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 16, minHeight: hauteur, animation: 'pulse 1.4s ease-in-out infinite' }} />
  )
}

function Erreur({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      gridColumn: '1 / -1', padding: '14px 18px', borderRadius: 12,
      border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b',
      display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, fontWeight: 600,
    }}>
      <AlertTriangle size={16} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onRetry} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
        <RefreshCw size={12} style={{ marginRight: 6, verticalAlign: -1 }} />Réessayer
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const aujourdhui = useTodayStats()
  const semaine = useWeekStats()
  const top = useTopProductsToday()

  const t = aujourdhui.data
  const points = semaine.data ?? []

  // Le point d'hier, s'il existe : c'est la seule base légitime pour un
  // « vs hier ». Aucune valeur inventée à défaut.
  const hier = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    return points.find((p) => p.date === dateISO(d)) ?? null
  }, [points])

  const panierHier = hier && hier.orders > 0 ? hier.revenue / hier.orders : null
  const maxSemaine = Math.max(1, ...points.map((p) => p.revenue))

  const rafraichirTout = () => { aujourdhui.refetch(); semaine.refetch(); top.refetch() }

  return (
    <div style={{ padding: 24, maxWidth: 1240, margin: '0 auto' }}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }`}</style>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Tableau de bord POS</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Ventes encaissées · {new Date().toLocaleDateString('fr-LU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={rafraichirTout}
          disabled={aujourdhui.isFetching}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
            border: '1px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, opacity: aujourdhui.isFetching ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} className={aujourdhui.isFetching ? 'spin' : undefined} />
          {aujourdhui.dataUpdatedAt
            ? `Actualisé à ${new Date(aujourdhui.dataUpdatedAt).toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })}`
            : 'Actualiser'}
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        {aujourdhui.isLoading ? (
          <>
            <Squelette /><Squelette /><Squelette /><Squelette />
          </>
        ) : aujourdhui.isError ? (
          <Erreur message="Impossible de charger les indicateurs du jour — le serveur n'a pas répondu. Les chiffres ne sont pas à zéro, ils sont inaccessibles." onRetry={() => aujourdhui.refetch()} />
        ) : t ? (
          <>
            <CarteKpi
              titre="Tables occupées"
              valeur={`${t.tablesOccupied} / ${t.tablesTotal}`}
              icone={Users}
              couleur="#6366f1"
              enAvant
              sousTitre={
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${t.tablesTotal ? Math.round((t.tablesOccupied / t.tablesTotal) * 100) : 0}%`, height: '100%', background: '#6366f1', transition: 'width .4s' }} />
                </div>
              }
            />
            <CarteKpi
              titre="CA du jour"
              valeur={fmt(t.revenue)}
              icone={Euro}
              couleur="#10b981"
              sousTitre={<Variation actuel={t.revenue} precedent={hier?.revenue ?? null} />}
            />
            <CarteKpi
              titre="Commandes payées"
              valeur={fmtEntier(t.orderCount)}
              icone={ShoppingCart}
              couleur="#f59e0b"
              sousTitre={<Variation actuel={t.orderCount} precedent={hier?.orders ?? null} />}
            />
            <CarteKpi
              titre="Panier moyen"
              valeur={fmt(t.avgTicket)}
              icone={Sparkles}
              couleur="#ec4899"
              sousTitre={<Variation actuel={t.avgTicket} precedent={panierHier} />}
            />
          </>
        ) : null}
      </div>

      {/* Semaine + top produits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* 7 derniers jours */}
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, minHeight: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={16} color="#6366f1" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>7 derniers jours</h2>
          </div>
          {semaine.isLoading ? (
            <Squelette hauteur={180} />
          ) : semaine.isError ? (
            <Erreur message="Historique de la semaine indisponible." onRetry={() => semaine.refetch()} />
          ) : points.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0', margin: 0 }}>
              Aucune vente encaissée sur les 7 derniers jours.
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
              {points.map((p) => {
                const h = Math.max(4, Math.round((p.revenue / maxSemaine) * 150))
                const estAujourdhui = p.date === dateISO(new Date())
                return (
                  <div key={p.date} title={`${p.date} · ${fmt(p.revenue)} · ${p.orders} cmd`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>{p.revenue > 0 ? fmtEntier(p.revenue) : ''}</span>
                    <div style={{ width: '100%', height: h, borderRadius: 6, background: estAujourdhui ? '#6366f1' : '#c7d2fe', transition: 'height .4s' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('fr-LU', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Top produits du jour */}
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, minHeight: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Flame size={16} color="#f59e0b" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Top produits du jour</h2>
          </div>
          {top.isLoading ? (
            <Squelette hauteur={180} />
          ) : top.isError ? (
            <Erreur message="Classement des produits indisponible." onRetry={() => top.refetch()} />
          ) : !top.data || top.data.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0', margin: 0 }}>
              Aucun produit vendu aujourd'hui pour l'instant.
            </p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top.data.slice(0, 5).map((p, i) => {
                const qte = p.totalQuantity ?? 0
                const max = top.data![0]?.totalQuantity ?? 1
                return (
                  <li key={p.product?.id ?? i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>
                        {p.product?.name ?? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Produit supprimé</span>}
                      </div>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((qte / Math.max(1, max)) * 100)}%`, height: '100%', background: '#f59e0b' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>{fmtEntier(qte)}×</span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
