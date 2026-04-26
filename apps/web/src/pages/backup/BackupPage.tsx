import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Database, Download, Upload, Trash2, RefreshCw, Plus, FileArchive, AlertTriangle } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface BackupFile {
  filename: string
  size: number
  createdAt: number
  items: number
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [stockSize, setStockSize] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchBackups = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/inventory-ocr/backups`)
      const data = await r.json()
      setBackups(data.backups || [])
    } catch { /* offline */ }
    try {
      const r = await fetch(`${BACKEND}/api/inventory-ocr/stock`)
      const data = await r.json()
      setStockSize(data.total || 0)
    } catch { /* offline */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBackups() }, [fetchBackups])

  const createBackup = async () => {
    setBusy('create')
    try {
      const r = await fetch(`${BACKEND}/api/inventory-ocr/backups`, { method: 'POST' })
      if (r.ok) {
        const data = await r.json()
        flash(`✓ Backup créé : ${data.filename} (${data.items} articles)`)
        fetchBackups()
      } else flash('❌ Erreur backup')
    } finally { setBusy(null) }
  }

  const restore = async (filename: string) => {
    if (!confirm(`Restaurer "${filename}" ? Le stock actuel sera remplacé.`)) return
    setBusy(filename)
    try {
      const r = await fetch(`${BACKEND}/api/inventory-ocr/restore/${filename}`, { method: 'POST' })
      if (r.ok) {
        const data = await r.json()
        flash(`✓ Restauration réussie — ${data.restored} articles`)
        fetchBackups()
      } else flash('❌ Erreur restauration')
    } finally { setBusy(null) }
  }

  const remove = async (filename: string) => {
    if (!confirm(`Supprimer le backup "${filename}" ?`)) return
    setBusy(filename)
    try {
      await fetch(`${BACKEND}/api/inventory-ocr/backups/${filename}`, { method: 'DELETE' })
      flash('✓ Backup supprimé')
      fetchBackups()
    } finally { setBusy(null) }
  }

  const download = (filename: string) => {
    window.open(`${BACKEND}/api/inventory-ocr/backups/${filename}/download`, '_blank')
  }

  const fmt = (n: number) => n < 1024 ? `${n}B` : n < 1048576 ? `${(n / 1024).toFixed(1)}KB` : `${(n / 1048576).toFixed(2)}MB`
  const fmtDate = (t: number) => new Date(t).toLocaleString('fr-FR')

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#0f172a' }}>
          💾 Sauvegardes & restauration
        </h1>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>
          Stockées sur disque dans <code style={{ fontSize: 12, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>apps/backend/data/backups/</code>
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Stat label="Stock actuel" value={`${stockSize} articles`} icon={<Database size={20} />} color="#6366f1" />
        <Stat label="Backups disponibles" value={String(backups.length)} icon={<FileArchive size={20} />} color="#10b981" />
        <Stat label="Total stockage" value={fmt(backups.reduce((s, b) => s + b.size, 0))} icon={<Database size={20} />} color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={createBackup} disabled={busy === 'create'} style={btnPrimary}>
          {busy === 'create' ? <><RefreshCw size={14} className="spin" /> Création…</> : <><Plus size={14} /> Créer un backup</>}
        </button>
        <button onClick={fetchBackups} style={btnSecondary}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>
      ) : backups.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center', background: '#f8fafc',
          border: '1px dashed #cbd5e1', borderRadius: 14,
        }}>
          <FileArchive size={48} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 700, color: '#1e293b' }}>Aucun backup pour le moment</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Cliquez sur « Créer un backup » pour sauvegarder le stock actuel.
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Th>Fichier</Th><Th>Articles</Th><Th>Taille</Th><Th>Date</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <motion.tr
                  key={b.filename}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td style={td}>
                    <code style={{ fontSize: 11, color: '#475569' }}>{b.filename}</code>
                  </td>
                  <td style={td}><strong>{b.items}</strong></td>
                  <td style={td}>{fmt(b.size)}</td>
                  <td style={{ ...td, color: '#64748b' }}>{fmtDate(b.createdAt)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => download(b.filename)} title="Télécharger" style={iconBtn('#6366f1')}>
                        <Download size={13} />
                      </button>
                      <button onClick={() => restore(b.filename)} disabled={busy === b.filename} title="Restaurer" style={iconBtn('#10b981')}>
                        <Upload size={13} />
                      </button>
                      <button onClick={() => remove(b.filename)} disabled={busy === b.filename} title="Supprimer" style={iconBtn('#ef4444')}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: 16, padding: 12, background: '#fef3c7', border: '1px solid #f59e0b',
        borderRadius: 10, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>Important</strong> : la restauration <em>écrase</em> le stock actuel.
          Créez un backup juste avant si vous voulez pouvoir revenir en arrière.
        </span>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', bottom: 24, right: 24, padding: '12px 18px',
            background: '#1e293b', color: '#fff', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1000, fontSize: 13, fontWeight: 600,
          }}>
          {toast}
        </motion.div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  )
}

const Th = ({ children }: any) => <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</th>
const td: React.CSSProperties = { padding: '10px 14px' }
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13,
}
const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
  background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13,
}
const iconBtn = (color: string): React.CSSProperties => ({
  padding: 6, borderRadius: 6, border: `1px solid ${color}30`,
  background: `${color}10`, color, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
