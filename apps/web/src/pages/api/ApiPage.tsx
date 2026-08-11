import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Intégrations.
 *
 * Cette page affichait 28 connecteurs marqués « Connectée » avec une heure de
 * dernière synchronisation, 4 clés API au format `pk_live_…`, 5 webhooks, des
 * quotas d'un « plan Business » et 20 lignes de journal — tout était inventé.
 * Aucun modèle Prisma `ApiKey`/`Webhook`/`Integration` n'existe, aucune route
 * serveur ne les sert, et `routes/stripe.ts` tourne sur la clé de repli
 * `sk_test_mock`. Un prospect qui voyait « QuickBooks — connectée » et
 * découvrait le vide perdait confiance dans tout le reste du produit.
 *
 * La page dit maintenant la vérité : ce qui marche vraiment aujourd'hui, et
 * un catalogue de connecteurs tous annoncés « bientôt disponible ».
 */

type Categorie =
  | 'Paiement' | 'Livraison' | 'Comptabilité' | 'Réservations'
  | 'Marketing' | 'Social' | 'Calendrier' | 'Communication'

interface Connecteur {
  id: string
  nom: string
  categorie: Categorie
  emoji: string
  description: string
  couleur: string
}

/** Catalogue = feuille de route. Aucun de ces connecteurs n'est actif. */
const CONNECTEURS: Connecteur[] = [
  { id: 'stripe', nom: 'Stripe', categorie: 'Paiement', emoji: '💳', description: 'Paiements carte et abonnements', couleur: '#635bff' },
  { id: 'sumup', nom: 'SumUp', categorie: 'Paiement', emoji: '📱', description: 'Terminal mobile, répandu au Luxembourg', couleur: '#0070f3' },
  { id: 'payconiq', nom: 'Payconiq / Digicash', categorie: 'Paiement', emoji: '🇱🇺', description: 'Paiement mobile luxembourgeois', couleur: '#ff4785' },
  { id: 'mollie', nom: 'Mollie', categorie: 'Paiement', emoji: '💶', description: 'Prestataire de paiement européen', couleur: '#000f3e' },

  { id: 'wedely', nom: 'Wedely', categorie: 'Livraison', emoji: '🛵', description: 'Livraison locale au Luxembourg', couleur: '#ff6b35' },
  { id: 'ubereats', nom: 'Uber Eats', categorie: 'Livraison', emoji: '🥡', description: 'Reprise automatique des commandes', couleur: '#06c167' },
  { id: 'deliveroo', nom: 'Deliveroo', categorie: 'Livraison', emoji: '🍽️', description: 'Reprise automatique des commandes', couleur: '#00ccbc' },

  { id: 'bob50', nom: 'BOB 50', categorie: 'Comptabilité', emoji: '📗', description: 'Comptabilité luxembourgeoise (Sage BOB)', couleur: '#1e40af' },
  { id: 'fiduciaire', nom: 'Envoi fiduciaire', categorie: 'Comptabilité', emoji: '📁', description: 'Transmission mensuelle des pièces', couleur: '#7c3aed' },
  { id: 'quickbooks', nom: 'QuickBooks', categorie: 'Comptabilité', emoji: '📊', description: 'Comptabilité en ligne', couleur: '#2ca01c' },

  { id: 'thefork', nom: 'TheFork', categorie: 'Réservations', emoji: '🍴', description: 'Réservations restaurant', couleur: '#00a19a' },
  { id: 'googlebook', nom: 'Réserver avec Google', categorie: 'Réservations', emoji: '🔍', description: 'Réserver depuis la fiche Google', couleur: '#4285f4' },

  { id: 'brevo', nom: 'Brevo', categorie: 'Marketing', emoji: '✉️', description: 'Campagnes e-mail et SMS', couleur: '#0b996e' },
  { id: 'mailchimp', nom: 'Mailchimp', categorie: 'Marketing', emoji: '📧', description: 'Campagnes e-mail', couleur: '#f59e0b' },

  { id: 'meta', nom: 'Meta Business', categorie: 'Social', emoji: '📘', description: 'Pages Facebook et Instagram', couleur: '#1877f2' },
  { id: 'gbusiness', nom: 'Google Business', categorie: 'Social', emoji: '🌐', description: 'Fiche établissement et avis', couleur: '#34a853' },

  { id: 'gcal', nom: 'Google Agenda', categorie: 'Calendrier', emoji: '📆', description: 'Synchronisation des plannings', couleur: '#4285f4' },
  { id: 'outlook', nom: 'Outlook', categorie: 'Calendrier', emoji: '📮', description: 'Agenda Microsoft 365', couleur: '#0078d4' },

  { id: 'whatsapp', nom: 'WhatsApp Business', categorie: 'Communication', emoji: '💬', description: 'Messages et notifications clients', couleur: '#25d366' },
  { id: 'sms', nom: 'SMS', categorie: 'Communication', emoji: '📲', description: 'SMS de confirmation et de rappel', couleur: '#f22f46' },
]

const CATEGORIES: Categorie[] = [
  'Paiement', 'Livraison', 'Comptabilité', 'Réservations',
  'Marketing', 'Social', 'Calendrier', 'Communication',
]

/** Capacités réellement livrées — chacune vérifiable dans le produit. */
const DEJA_LA = [
  { emoji: '🔄', titre: 'Temps réel entre les postes', texte: 'La caisse, le back-office et le portail client partagent le même état sans rafraîchir la page.' },
  { emoji: '📱', titre: 'Portail client par QR code', texte: 'Le client consulte la carte et appelle le service depuis son téléphone, sans installer d\'application.' },
  { emoji: '📥', titre: 'Exports Excel', texte: 'Ventes, stock, clients et comptabilité s\'exportent au format lisible directement par Excel en français.' },
  { emoji: '💾', titre: 'Sauvegarde automatique', texte: 'Archive complète toutes les 6 heures, base de données comprise, conservée sur 30 versions.' },
]

function ApiPage() {
  const [categorie, setCategorie] = useState<Categorie | 'toutes'>('toutes')
  const visibles = categorie === 'toutes' ? CONNECTEURS : CONNECTEURS.filter((c) => c.categorie === categorie)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)', padding: '32px 40px' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>🔌</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#111827', fontWeight: 700 }}>Intégrations</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Ce qui fonctionne aujourd'hui, et ce qui est prévu</p>
          </div>
        </div>
      </motion.div>

      {/* L'information la plus importante de la page, dite d'emblée. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #475569', borderRadius: 12, padding: '18px 22px', marginBottom: 24 }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          Aucun connecteur externe n'est actif pour le moment.
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: '#4b5563', lineHeight: 1.6 }}>
          Creorga fonctionne aujourd'hui en autonomie complète : tout est hébergé sur votre
          serveur, et aucune donnée ne part chez un tiers. Les connecteurs ci-dessous sont
          la feuille de route — ils seront activés un par un, sur demande.
        </p>
      </motion.div>

      <h2 style={{ fontSize: 17, color: '#111827', fontWeight: 700, margin: '0 0 12px' }}>Ce qui fonctionne déjà</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginBottom: 32 }}>
        {DEJA_LA.map((c, i) => (
          <motion.div
            key={c.titre}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f3f4f6' }}
          >
            <div style={{ fontSize: 24, marginBottom: 10 }}>{c.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{c.titre}</div>
            <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>{c.texte}</div>
          </motion.div>
        ))}
      </div>

      <h2 style={{ fontSize: 17, color: '#111827', fontWeight: 700, margin: '0 0 4px' }}>Connecteurs prévus</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
        {CONNECTEURS.length} connecteurs à l'étude. Dites-nous lesquels comptent pour vous : ce sont
        ceux-là qui seront faits en premier.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setCategorie('toutes')}
          style={{ padding: '8px 14px', borderRadius: 20, background: categorie === 'toutes' ? '#111827' : '#fff', color: categorie === 'toutes' ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb' }}
        >
          Tous ({CONNECTEURS.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategorie(c)}
            style={{ padding: '8px 14px', borderRadius: 20, background: categorie === c ? '#111827' : '#fff', color: categorie === c ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb' }}
          >
            {c} ({CONNECTEURS.filter((x) => x.categorie === c).length})
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
        {visibles.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f3f4f6' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${c.couleur}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.emoji}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{c.nom}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{c.categorie}</div>
                </div>
              </div>
              {/* Un seul état possible, parce qu'il n'y en a qu'un de vrai. */}
              <span style={{ padding: '3px 8px', borderRadius: 5, background: '#f3f4f6', color: '#6b7280', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                BIENTÔT DISPONIBLE
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{c.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ApiPage
