import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Archive,
  Database,
  FileArchive,
  Folder,
  HardDrive,
  HeartPulse,
  Server,
  Table2,
} from 'lucide-react'
import { creatorApi } from '../lib/api'
import { carte, couleurs, depuis, formatNombre, formatOctets } from '../lib/theme'

/**
 * Santé serveur — état réel de l'infrastructure de la console créateur.
 * Données : GET /health + GET /backups, rafraîchies toutes les 30 s.
 */

// ─── Types des réponses API ─────────────────────────────────────────────

interface SanteServeur {
  base: { ok: boolean; tailleOctets: number; tailleActivityEventOctets: number }
  disque: { total: number; libre: number } | null
  dossierData: { tailleOctets: number }
  sauvegardes: {
    dernierZip: string | number | null
    dernierDump: string | number | null
    nbZips: number
    nbDumps: number
  }
  service: { uptimeSecondes: number; version: string; node: string }
  dernieres24h: { erreurs: number; evenements: number }
}

interface Sauvegarde {
  filename: string
  size: number
  /** Millisecondes epoch. */
  createdAt: number
}

interface ReponseSauvegardes {
  zips: Sauvegarde[]
  dumps: Sauvegarde[]
}

// ─── Aides locales ──────────────────────────────────────────────────────

const VINGT_QUATRE_HEURES_MS = 24 * 60 * 60 * 1000

function formatUptime(secondes: number): string {
  const jours = Math.floor(secondes / 86_400)
  const heures = Math.floor((secondes % 86_400) / 3_600)
  const minutes = Math.floor((secondes % 3_600) / 60)
  if (jours > 0) return `${jours} j ${heures} h ${minutes} min`
  if (heures > 0) return `${heures} h ${minutes} min`
  return `${minutes} min`
}

/** Les 10 plus récentes d'abord (createdAt en ms epoch). */
function dixDernieres(liste: Sauvegarde[]): Sauvegarde[] {
  return [...liste].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function TenantHealthPage() {
  const sante = useQuery({
    queryKey: ['health'],
    queryFn: () => creatorApi.get<SanteServeur>('/health'),
    refetchInterval: 30_000,
  })

  const sauvegardes = useQuery({
    queryKey: ['backups'],
    queryFn: () => creatorApi.get<ReponseSauvegardes>('/backups'),
    refetchInterval: 30_000,
  })

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>
          <HeartPulse size={22} style={{ marginRight: 8, verticalAlign: -3, color: couleurs.accent }} />
          Santé serveur
        </h1>
        <p style={{ margin: '4px 0 0', color: couleurs.texteSecondaire, fontSize: 13 }}>
          État réel de l'infrastructure — rafraîchi toutes les 30 s
        </p>
      </header>

      {sante.isLoading && (
        <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 14 }}>Chargement…</div>
      )}

      {sante.isError && (
        <div style={{ ...carte, borderColor: 'rgba(248, 113, 113, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: couleurs.rouge, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} />
            Impossible de charger l'état du serveur
          </div>
          <p style={{ margin: '8px 0 0', color: couleurs.texteSecondaire, fontSize: 13 }}>
            {sante.error instanceof Error ? sante.error.message : 'Erreur inconnue'}
          </p>
        </div>
      )}

      {sante.data && <TuilesSante donnees={sante.data} />}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
          <Archive size={16} style={{ marginRight: 8, verticalAlign: -2, color: couleurs.accent }} />
          Sauvegardes
        </h2>

        {sauvegardes.isLoading && (
          <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 14 }}>Chargement…</div>
        )}

        {sauvegardes.isError && (
          <div style={{ ...carte, borderColor: 'rgba(248, 113, 113, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: couleurs.rouge, fontWeight: 700, fontSize: 14 }}>
              <AlertTriangle size={16} />
              Impossible de charger les sauvegardes
            </div>
            <p style={{ margin: '8px 0 0', color: couleurs.texteSecondaire, fontSize: 13 }}>
              {sauvegardes.error instanceof Error ? sauvegardes.error.message : 'Erreur inconnue'}
            </p>
          </div>
        )}

        {sauvegardes.data && <SectionSauvegardes donnees={sauvegardes.data} />}
      </section>
    </div>
  )
}

// ─── Tuiles d'état ──────────────────────────────────────────────────────

function TuilesSante({ donnees }: { donnees: SanteServeur }) {
  const { base, disque, dossierData, service, dernieres24h } = donnees

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      <Tuile index={0} icone={<Database size={16} />} titre="Base de données"
        couleurTitre={base.ok ? couleurs.vert : couleurs.rouge}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: base.ok ? couleurs.vert : couleurs.rouge,
          }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: base.ok ? couleurs.vert : couleurs.rouge }}>
            {base.ok ? 'connectée' : 'injoignable'}
          </span>
        </div>
        <SousLigne>{base.ok ? `Taille : ${formatOctets(base.tailleOctets)}` : 'La base ne répond pas'}</SousLigne>
      </Tuile>

      <Tuile index={1} icone={<HardDrive size={16} />} titre="Disque" couleurTitre={couleurDisque(disque)}>
        {disque ? <DetailDisque disque={disque} /> : (
          <SousLigne>Information disque indisponible sur cet hôte</SousLigne>
        )}
      </Tuile>

      <Tuile index={2} icone={<Folder size={16} />} titre="Dossier data/" couleurTitre={couleurs.accent}>
        <Valeur>{formatOctets(dossierData.tailleOctets)}</Valeur>
        <SousLigne>Fichiers JSON, exports et pièces jointes</SousLigne>
      </Tuile>

      <Tuile index={3} icone={<Table2 size={16} />} titre="Table ActivityEvent" couleurTitre={couleurs.bleu}>
        <Valeur>{formatOctets(base.tailleActivityEventOctets)}</Valeur>
        <SousLigne>La console se surveille elle-même</SousLigne>
      </Tuile>

      <Tuile index={4} icone={<Server size={16} />} titre="Service" couleurTitre={couleurs.accent}>
        <Valeur>{formatUptime(service.uptimeSecondes)}</Valeur>
        <SousLigne>Version {service.version} · Node {service.node}</SousLigne>
      </Tuile>

      <Tuile index={5} icone={<Activity size={16} />} titre="Dernières 24 h"
        couleurTitre={dernieres24h.erreurs > 0 ? couleurs.rouge : couleurs.vert}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <Valeur couleur={dernieres24h.erreurs > 0 ? couleurs.rouge : couleurs.vert}>
              {formatNombre(dernieres24h.erreurs)}
            </Valeur>
            <SousLigne>erreurs</SousLigne>
          </div>
          <div>
            <Valeur>{formatNombre(dernieres24h.evenements)}</Valeur>
            <SousLigne>événements collectés</SousLigne>
          </div>
        </div>
      </Tuile>
    </div>
  )
}

function couleurDisque(disque: SanteServeur['disque']): string {
  if (!disque || disque.total <= 0) return couleurs.texteSecondaire
  const pctLibre = (disque.libre / disque.total) * 100
  if (pctLibre < 10) return couleurs.rouge
  if (pctLibre < 20) return couleurs.orange
  return couleurs.vert
}

function DetailDisque({ disque }: { disque: NonNullable<SanteServeur['disque']> }) {
  const pctLibre = disque.total > 0 ? (disque.libre / disque.total) * 100 : 0
  const pctUtilise = Math.min(100, Math.max(0, 100 - pctLibre))
  const couleur = couleurDisque(disque)

  return (
    <>
      <Valeur couleur={couleur}>
        {formatOctets(disque.libre)}
        <span style={{ fontSize: 13, fontWeight: 500, color: couleurs.texteSecondaire }}>
          {' '}libres sur {formatOctets(disque.total)}
        </span>
      </Valeur>
      <div style={{
        marginTop: 10, height: 8, borderRadius: 999,
        background: couleurs.bordure, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pctUtilise}%`, height: '100%', borderRadius: 999,
          background: couleur, transition: 'width .4s',
        }} />
      </div>
      <SousLigne>{pctUtilise.toFixed(1)} % utilisé · {pctLibre.toFixed(1)} % libre</SousLigne>
    </>
  )
}

// ─── Sauvegardes ────────────────────────────────────────────────────────

function SectionSauvegardes({ donnees }: { donnees: ReponseSauvegardes }) {
  const zips = dixDernieres(donnees.zips)
  const dumps = dixDernieres(donnees.dumps)

  const dernierZipMs = donnees.zips.length > 0
    ? Math.max(...donnees.zips.map((z) => z.createdAt))
    : null
  const zipEnRetard = dernierZipMs === null || Date.now() - dernierZipMs > VINGT_QUATRE_HEURES_MS

  return (
    <>
      {zipEnRetard && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 18px', borderRadius: 12, marginBottom: 14,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: couleurs.rouge, fontWeight: 700, fontSize: 14,
          }}
        >
          <AlertTriangle size={18} />
          {dernierZipMs === null
            ? 'Aucun ZIP de sauvegarde trouvé — vérifier le backup-worker immédiatement.'
            : `Dernier ZIP ${depuis(new Date(dernierZipMs))} : plus de 24 h sans sauvegarde — vérifier le backup-worker.`}
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
        <ListeSauvegardes
          titre="ZIP data/"
          icone={<Archive size={15} />}
          elements={zips}
          messageVide="Aucun ZIP — le worker produit une archive 60 s après le démarrage puis toutes les 6 h"
        />
        <ListeSauvegardes
          titre="Dumps PostgreSQL"
          icone={<FileArchive size={15} />}
          elements={dumps}
          messageVide="Aucun dump PostgreSQL — vérifier que pg_dump (ou le repli docker exec) fonctionne"
        />
      </div>
    </>
  )
}

function ListeSauvegardes({ titre, icone, elements, messageVide }: {
  titre: string
  icone: React.ReactNode
  elements: Sauvegarde[]
  messageVide: string
}) {
  return (
    <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: `1px solid ${couleurs.bordure}`,
        fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
        color: couleurs.texteSecondaire,
      }}>
        <span style={{ color: couleurs.accent, display: 'inline-flex' }}>{icone}</span>
        {titre}
        <span style={{ marginLeft: 'auto', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
          {elements.length === 0 ? '' : `${elements.length} affichée${elements.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {elements.length === 0 ? (
        <p style={{ margin: 0, padding: '18px 16px', fontSize: 13, color: couleurs.texteDiscret }}>
          {messageVide}
        </p>
      ) : (
        elements.map((s, i) => (
          <motion.div
            key={s.filename}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 12,
              padding: '10px 16px', fontSize: 13, color: couleurs.texte,
              borderBottom: i === elements.length - 1 ? 'none' : `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <span style={{
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace', fontSize: 12,
            }}>
              {s.filename}
            </span>
            <span style={{ color: couleurs.texteSecondaire, whiteSpace: 'nowrap' }}>
              {formatOctets(s.size)}
            </span>
            <span style={{ color: couleurs.texteDiscret, whiteSpace: 'nowrap', fontSize: 12 }}>
              {depuis(new Date(s.createdAt))}
            </span>
          </motion.div>
        ))
      )}
    </div>
  )
}

// ─── Petits composants d'affichage ──────────────────────────────────────

function Tuile({ index, icone, titre, couleurTitre, children }: {
  index: number
  icone: React.ReactNode
  titre: string
  couleurTitre: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        ...carte,
        background: `linear-gradient(135deg, ${couleurTitre}12, ${couleurs.panneau})`,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        color: couleurTitre, fontSize: 11, fontWeight: 700, letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {icone} {titre}
      </div>
      {children}
    </motion.div>
  )
}

function Valeur({ children, couleur }: { children: React.ReactNode; couleur?: string }) {
  return (
    <div style={{ fontSize: 22, fontWeight: 800, color: couleur ?? '#f1f5f9' }}>
      {children}
    </div>
  )
}

function SousLigne({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: couleurs.texteSecondaire, marginTop: 4 }}>
      {children}
    </div>
  )
}
