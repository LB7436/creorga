/**
 * Palette et aides d'affichage de la console créateur.
 * Factorise ce que chaque page maquette redéclarait en dur.
 */

export const couleurs = {
  fond: '#0a0a0f',
  panneau: '#13131a',
  bordure: '#2a2a35',
  accent: '#a78bfa',
  accentFonce: '#7c3aed',
  texte: '#e2e8f0',
  texteSecondaire: '#94a3b8',
  texteDiscret: '#64748b',
  vert: '#4ade80',
  orange: '#fbbf24',
  rouge: '#f87171',
  bleu: '#60a5fa',
} as const

/** Style de carte standard (panneau sombre arrondi). */
export const carte: React.CSSProperties = {
  background: couleurs.panneau,
  border: `1px solid ${couleurs.bordure}`,
  borderRadius: 12,
  padding: 20,
}

const euro = new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' })
export const formatEuro = (n: number | null | undefined) => euro.format(n ?? 0)

const nombre = new Intl.NumberFormat('fr-LU')
export const formatNombre = (n: number | null | undefined) => nombre.format(n ?? 0)

export function formatOctets(octets: number | null | undefined): string {
  const n = octets ?? 0
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} Go`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} Mo`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${n} o`
}

/** « il y a 3 h », « il y a 2 j » — ou « jamais » si absent. */
export function depuis(date: string | Date | null | undefined): string {
  if (!date) return 'jamais'
  const ms = Date.now() - new Date(date).getTime()
  if (ms < 0) return 'à l’instant'
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  if (jours < 60) return `il y a ${jours} j`
  return new Date(date).toLocaleDateString('fr-LU')
}

export function formatDateHeure(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-LU', { dateStyle: 'short', timeStyle: 'medium' })
}
