import { useState, useMemo } from 'react'
import { MODULES } from '@/stores/moduleStore'
import { useModulePreferences, type ModuleDisplayMode } from '@/stores/modulePreferencesStore'
import { espaceDuModule } from '@/config/espaces'
import { toastError, toastSuccess } from '@/lib/toast'

/**
 * Configurateur de modules — visible/masqué/bientôt, libellé, épinglage.
 *
 * Écrit désormais sur le serveur (store modulePreferencesStore) : l'ancienne
 * version n'écrivait qu'en localStorage pendant que le sélecteur fusionnait
 * « le distant gagne » — les réglages étaient écrasés en silence et jamais
 * partagés entre navigateurs. Chaque contrôle se désactive pendant
 * l'enregistrement et REVIENT à sa valeur si le serveur refuse.
 */
const MODE_LABELS: Record<ModuleDisplayMode, { label: string; color: string; emoji: string }> = {
  visible:     { label: 'Visible',      color: '#10b981', emoji: '👁' },
  hidden:      { label: 'Masqué',       color: '#64748b', emoji: '🔒' },
  coming_soon: { label: 'Bientôt',      color: '#f59e0b', emoji: '🚧' },
}

export default function SettingsModules() {
  const config = useModulePreferences((s) => s.config)
  const enAttente = useModulePreferences((s) => s.enAttente)
  const etat = useModulePreferences((s) => s.etat)
  const erreur = useModulePreferences((s) => s.erreur)
  const regler = useModulePreferences((s) => s.regler)
  const reinitialiser = useModulePreferences((s) => s.reinitialiser)
  const [filter, setFilter] = useState('')
  // Le libellé s'édite librement puis s'enregistre au blur : un PATCH par
  // frappe clavier saturerait le serveur pour rien.
  const [brouillonsLibelle, setBrouillonsLibelle] = useState<Record<string, string>>({})

  const modules = useMemo(() => {
    const q = filter.toLowerCase()
    return MODULES.filter((m) =>
      !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.tagline.toLowerCase().includes(q)
    )
  }, [filter])

  const count = useMemo(() => {
    const counts = { visible: 0, hidden: 0, coming_soon: 0 }
    MODULES.forEach((m) => {
      const mode = config[m.id]?.displayMode ?? 'visible'
      counts[mode]++
    })
    return counts
  }, [config])

  const changerMode = (id: string, mode: ModuleDisplayMode) => {
    regler(id, { displayMode: mode }).catch(() => {
      toastError('Enregistrement refusé par le serveur — le réglage a été annulé.')
    })
  }

  const changerEpingle = (id: string, pinned: boolean) => {
    regler(id, { pinnedToDashboard: pinned }).catch(() => {
      toastError('Enregistrement refusé par le serveur — le réglage a été annulé.')
    })
  }

  const enregistrerLibelle = (id: string) => {
    const brouillon = brouillonsLibelle[id]
    if (brouillon === undefined) return
    const actuel = config[id]?.customLabel ?? ''
    if (brouillon === actuel) return
    regler(id, { customLabel: brouillon || undefined }).catch(() => {
      toastError('Libellé refusé par le serveur — valeur précédente conservée.')
      setBrouillonsLibelle((b) => ({ ...b, [id]: actuel }))
    })
  }

  const toutReinitialiser = () => {
    reinitialiser()
      .then(() => toastSuccess('Configuration des modules réinitialisée.'))
      .catch(() => toastError('Réinitialisation refusée par le serveur.'))
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Configurateur de modules</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Activez, masquez ou marquez comme « Bientôt » chacun des {MODULES.length} modules.
          Les réglages sont enregistrés sur le serveur et partagés entre tous les postes.
        </p>
      </header>

      {/* L'échec de synchronisation est affiché, jamais tu. */}
      {etat === 'erreur' && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b',
          fontSize: 13, fontWeight: 600,
        }}>
          ⚠ Serveur injoignable ({erreur}) — les réglages affichés sont la dernière copie
          connue et les modifications seront refusées tant que la connexion n'est pas rétablie.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['visible', 'coming_soon', 'hidden'] as ModuleDisplayMode[]).map((m) => (
          <div key={m} style={{
            flex: 1, minWidth: 140,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 24 }}>{MODE_LABELS[m].emoji}</div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{MODE_LABELS[m].label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: MODE_LABELS[m].color }}>{count[m]}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher un module…"
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid #e2e8f0', fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={toutReinitialiser} style={{
          padding: '10px 14px', borderRadius: 10, border: '1px solid #fee2e2', background: '#fef2f2',
          color: '#991b1b', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>↺ Réinitialiser</button>
      </div>

      {/* Modules list */}
      <div style={{ display: 'grid', gap: 8 }}>
        {modules.map((m) => {
          const c = config[m.id] ?? { displayMode: 'visible' as ModuleDisplayMode }
          const enregistrement = Boolean(enAttente[m.id])
          const espace = espaceDuModule(m.id)
          return (
            <div key={m.id} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14,
              display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 14, alignItems: 'center',
              opacity: enregistrement ? 0.65 : 1, transition: 'opacity .15s',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: `${m.color ?? '#6366f1'}15`, color: m.color ?? '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>{m.name.slice(0, 1)}</div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {c.customLabel || m.name}
                  <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{m.id}</span>
                  {espace && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: espace.couleur,
                      background: `${espace.couleur}14`, border: `1px solid ${espace.couleur}33`,
                      borderRadius: 999, padding: '2px 8px',
                    }}>
                      {espace.emoji} {espace.nom}
                    </span>
                  )}
                  {enregistrement && (
                    <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Enregistrement…</span>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{m.tagline}</div>
                <input
                  type="text"
                  value={brouillonsLibelle[m.id] ?? c.customLabel ?? ''}
                  disabled={enregistrement}
                  onChange={(e) => setBrouillonsLibelle((b) => ({ ...b, [m.id]: e.target.value }))}
                  onBlur={() => enregistrerLibelle(m.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  placeholder={`Libellé personnalisé (défaut: ${m.name})`}
                  style={{
                    marginTop: 6, width: '100%', padding: '6px 10px', fontSize: 12,
                    border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc',
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: enregistrement ? 'wait' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={c.pinnedToDashboard ?? false}
                  disabled={enregistrement}
                  onChange={(e) => changerEpingle(m.id, e.target.checked)}
                />
                📌 Épingler
              </label>

              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 999, padding: 3 }}>
                {(['visible', 'coming_soon', 'hidden'] as ModuleDisplayMode[]).map((mode) => {
                  const active = c.displayMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => changerMode(m.id, mode)}
                      disabled={enregistrement || active}
                      style={{
                        padding: '6px 12px', borderRadius: 999, border: 'none',
                        cursor: enregistrement ? 'wait' : active ? 'default' : 'pointer',
                        background: active ? MODE_LABELS[mode].color : 'transparent',
                        color: active ? '#fff' : '#64748b',
                        fontSize: 12, fontWeight: 600, transition: 'all .15s',
                      }}
                    >
                      {MODE_LABELS[mode].emoji} {MODE_LABELS[mode].label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
