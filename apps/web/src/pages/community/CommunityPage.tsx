import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Post {
  id: string
  auteur: string
  type: string
  anonyme: boolean
  contenu: string
  categorie: string
  likes: number
  commentaires: number
  date: string
  liked: boolean
}

interface Group {
  id: string
  nom: string
  membres: number
  description: string
  prive: boolean
}

interface Event {
  id: string
  titre: string
  date: string
  lieu: string
  type: 'meetup' | 'webinaire' | 'formation'
  participants: number
  max: number
}

interface MarketplaceItem {
  id: string
  type: 'depannage' | 'staff' | 'achat_groupe'
  titre: string
  auteur: string
  description: string
  date: string
  urgent: boolean
}

interface Expert {
  nom: string
  specialite: string
  note: number
  ville: string
  tarif: string
}

const colors = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#db2777',
  primaryLight: '#fce7f3',
  primaryDark: '#9d174d',
  info: '#0284c7',
  infoLight: '#e0f2fe',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
}

const CATEGORIES = [
  { id: 'all', label: 'Tout', color: colors.textMuted },
  { id: 'operations', label: 'Opérations', color: colors.primary },
  { id: 'recettes', label: 'Recettes', color: colors.warning },
  { id: 'fournisseurs', label: 'Fournisseurs', color: colors.success },
  { id: 'marketing', label: 'Marketing', color: colors.info },
  { id: 'staff', label: 'Staff', color: colors.purple },
  { id: 'tech', label: 'Tech tips', color: '#0891b2' },
]

const INITIAL_POSTS: Post[] = [
  { id: 'P1', auteur: 'Brasserie M.', type: 'Brasserie', anonyme: false, contenu: 'Comment gérer le rush du samedi soir avec seulement 2 serveurs? Nos tables tournent mal et les clients attendent trop.', categorie: 'operations', likes: 42, commentaires: 18, date: 'Il y a 2h', liked: false },
  { id: 'P2', auteur: 'Restaurant anonyme', type: 'Gastronomique', anonyme: true, contenu: 'Je partage ma recette signature de viande de cheval marinée 72h au vin rouge de Moselle. Parfait pour la carte automne.', categorie: 'recettes', likes: 87, commentaires: 34, date: 'Il y a 5h', liked: true },
  { id: 'P3', auteur: 'Café du Centre', type: 'Café', anonyme: false, contenu: 'Cherche un fournisseur fiable pour produits bio livrés en centre-ville. Ceux qu\'on testait ne sont plus dispo.', categorie: 'fournisseurs', likes: 23, commentaires: 12, date: 'Il y a 1j', liked: false },
  { id: 'P4', auteur: 'Restaurant anonyme', type: 'Pizzeria', anonyme: true, contenu: 'Campagne Instagram avec micro-influenceurs locaux → +38% réservations en 3 semaines. Budget 400€. AMA.', categorie: 'marketing', likes: 156, commentaires: 52, date: 'Il y a 1j', liked: true },
  { id: 'P5', auteur: 'Bistrot Moselle', type: 'Bistrot', anonyme: false, contenu: 'Turnover staff à 40% sur la saison. Des idées pour fidéliser? On a déjà augmenté les salaires...', categorie: 'staff', likes: 61, commentaires: 29, date: 'Il y a 2j', liked: false },
  { id: 'P6', auteur: 'Restaurant anonyme', type: 'Brasserie', anonyme: true, contenu: 'Astuce Creorga: créer un raccourci "Happy Hour" sur le POS pour appliquer −20% automatiquement entre 17h et 19h.', categorie: 'tech', likes: 94, commentaires: 15, date: 'Il y a 3j', liked: false },
]

const GROUPS: Group[] = [
  { id: 'G1', nom: 'Restaurants Rumelange', membres: 28, description: 'Réseau local des restaurants de Rumelange', prive: false },
  { id: 'G2', nom: 'Cafés Luxembourg', membres: 124, description: 'Communauté des cafés LU', prive: false },
  { id: 'G3', nom: 'Brasseries Moselle', membres: 47, description: 'Brasseries et tavernes Moselle', prive: true },
  { id: 'G4', nom: 'Gastro Premium LU', membres: 19, description: 'Restaurants étoilés et gastronomiques', prive: true },
  { id: 'G5', nom: 'Pizzerias du Grand-Duché', membres: 62, description: 'Pizzerias et restos italiens', prive: false },
]

const EVENTS: Event[] = [
  { id: 'E1', titre: 'Meetup Creorga Kirchberg', date: '2026-04-25', lieu: 'Luxembourg-Ville', type: 'meetup', participants: 38, max: 50 },
  { id: 'E2', titre: 'Webinaire HACCP 2026', date: '2026-05-02', lieu: 'En ligne', type: 'webinaire', participants: 112, max: 300 },
  { id: 'E3', titre: 'Formation Sommelier Moselle', date: '2026-05-18', lieu: 'Remich', type: 'formation', participants: 14, max: 20 },
  { id: 'E4', titre: 'Salon HORECA Luxexpo', date: '2026-06-10', lieu: 'Luxembourg-Kirchberg', type: 'meetup', participants: 245, max: 500 },
]

const MARKETPLACE: MarketplaceItem[] = [
  { id: 'M1', type: 'depannage', titre: 'Four en panne — besoin location urgente', auteur: 'Restaurant Luxembourg-Centre', description: 'Four professionnel HS, besoin dépannage ou location 3 jours', date: 'Il y a 3h', urgent: true },
  { id: 'M2', type: 'staff', titre: 'Serveur(se) disponible soirée samedi', auteur: 'Brasserie Rumelange', description: 'Notre serveuse peut dépanner ce samedi soir 18h-minuit', date: 'Il y a 6h', urgent: false },
  { id: 'M3', type: 'achat_groupe', titre: 'Achat groupé huile olive — 20% remise', auteur: 'Collectif Moselle', description: '8 restos intéressés déjà, besoin de 2 de plus pour déclencher', date: 'Il y a 1j', urgent: false },
  { id: 'M4', type: 'depannage', titre: 'Machine à café Jura à vendre', auteur: 'Café Ettelbruck', description: 'Machine 18 mois, parfait état, 1800€ (neuve 3200€)', date: 'Il y a 2j', urgent: false },
  { id: 'M5', type: 'staff', titre: 'Recherche cuisinier CDI temps partiel', auteur: 'Bistrot Esch', description: '20h/semaine, midi uniquement, bonne ambiance', date: 'Il y a 3j', urgent: false },
]

const EXPERTS: Expert[] = [
  { nom: 'Chef Marie Bertholet', specialite: 'Cuisine gastronomique Moselle', note: 4.9, ville: 'Luxembourg', tarif: '180€/h' },
  { nom: 'Pierre Dubois Consulting', specialite: 'Rentabilité HORECA', note: 4.8, ville: 'Esch', tarif: '150€/h' },
  { nom: 'Sophie Ledent', specialite: 'Marketing digital restauration', note: 4.7, ville: 'Luxembourg', tarif: '120€/h' },
  { nom: 'Chef Jean-Marc Klein', specialite: 'Pâtisserie & viennoiserie', note: 5.0, ville: 'Diekirch', tarif: '200€/h' },
  { nom: 'Anne Moutschen', specialite: 'Gestion RH & paie', note: 4.8, ville: 'Ettelbruck', tarif: '95€/h' },
]

const SUCCESS_STORIES = [
  { titre: 'De 40 à 80 couverts/jour en 6 mois', type: 'Pizzeria', resume: 'Refonte menu + campagne Insta + partenariat livraison', metric: '+100% CA' },
  { titre: 'Turnover divisé par 3', type: 'Brasserie', resume: 'Prime fidélité mensuelle + horaires flexibles', metric: '−67% départs' },
  { titre: 'Food waste passé de 8% à 2%', type: 'Gastronomique', resume: 'Portions recalibrées + doggy bag systématique', metric: '+12k€/an' },
]

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export default function CommunityPage() {
  const [tab, setTab] = useState<'feed' | 'benchmark' | 'groups' | 'events' | 'marketplace' | 'experts' | 'stories'>('feed')
  const [category, setCategory] = useState('all')
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [newPost, setNewPost] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set(['G1']))

  const filtered = category === 'all' ? posts : posts.filter((p) => p.categorie === category)

  const like = (id: string) => {
    setPosts(posts.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p))
  }

  const submit = () => {
    if (!newPost.trim()) return
    const p: Post = {
      id: `P${Date.now()}`,
      auteur: 'Vous',
      type: 'Brasserie',
      anonyme: false,
      contenu: newPost,
      categorie: 'operations',
      likes: 0,
      commentaires: 0,
      date: "À l'instant",
      liked: false,
    }
    setPosts([p, ...posts])
    setNewPost('')
    setShowCompose(false)
  }

  const toggleGroup = (id: string) => {
    const next = new Set(joinedGroups)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setJoinedGroups(next)
  }

  const stats = [
    { label: 'Membres actifs', value: '412', sub: 'restaurants LU', color: colors.primary },
    { label: 'Discussions', value: '1 240', sub: 'ce mois', color: colors.info },
    { label: 'Tips partagés', value: '560', sub: 'astuces community', color: colors.success },
    { label: 'Votre rang', value: 'Top 15%', sub: 'catégorie brasserie', color: colors.warning },
  ]

  const benchmarks = [
    { label: 'CA moyen mensuel', you: 48000, avg: 42800, unit: '€', delta: '+12%', better: true },
    { label: 'Taux occupation tables', you: 72, avg: 65, unit: '%', delta: '+7 pts', better: true },
    { label: 'Panier moyen', you: 34, avg: 38, unit: '€', delta: '−4€', better: false },
    { label: 'Taux fidélisation', you: 42, avg: 38, unit: '%', delta: '+4 pts', better: true },
    { label: 'Coûts personnel', you: 38, avg: 34, unit: '%', delta: '+4 pts', better: false },
  ]

  const eventColor = (t: string) => t === 'meetup' ? colors.primary : t === 'webinaire' ? colors.info : colors.purple

  const mktIcon = (t: string) => t === 'depannage' ? 'DÉPANNAGE' : t === 'staff' ? 'STAFF' : 'ACHAT GROUPÉ'
  const mktColor = (t: string) => t === 'depannage' ? colors.danger : t === 'staff' ? colors.purple : colors.success
  const mktBg = (t: string) => t === 'depannage' ? colors.dangerLight : t === 'staff' ? colors.purpleLight : colors.successLight

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24, color: colors.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <motion.div {...fadeIn} style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Communauté Creorga</h1>
          <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: 14 }}>
            Le réseau social des restaurants luxembourgeois — partage, benchmark & entraide
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '24px 0' }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border}`, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['feed', 'benchmark', 'groups', 'events', 'marketplace', 'experts', 'stories'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${colors.primary}` : '2px solid transparent',
                color: tab === t ? colors.primary : colors.textMuted,
                fontWeight: tab === t ? 600 : 500,
                cursor: 'pointer',
                fontSize: 14,
                textTransform: 'capitalize',
              }}
            >
              {t === 'feed' ? 'Fil' : t === 'benchmark' ? 'Benchmarks' : t === 'groups' ? 'Groupes' : t === 'events' ? 'Événements' : t === 'marketplace' ? 'Marketplace' : t === 'experts' ? 'Experts' : 'Success Stories'}
            </button>
          ))}
        </div>

        {tab === 'feed' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    style={{
                      padding: '6px 14px',
                      background: category === c.id ? c.color : 'transparent',
                      color: category === c.id ? '#fff' : c.color,
                      border: `1px solid ${c.color}`,
                      borderRadius: 16,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}>
                {!showCompose ? (
                  <button
                    onClick={() => setShowCompose(true)}
                    style={{
                      width: '100%',
                      padding: 12,
                      textAlign: 'left',
                      background: '#fafafa',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      color: colors.textMuted,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    Partager un tip, poser une question...
                  </button>
                ) : (
                  <div>
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Que voulez-vous partager ?"
                      style={{
                        width: '100%',
                        minHeight: 80,
                        padding: 10,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowCompose(false)} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                      <button onClick={submit} style={{ padding: '8px 14px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Publier</button>
                    </div>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {filtered.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      padding: 18,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 20,
                          background: p.anonyme ? '#e2e8f0' : colors.primaryLight,
                          color: p.anonyme ? colors.textMuted : colors.primary,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14,
                        }}>
                          {p.anonyme ? '?' : p.auteur[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.auteur}</div>
                          <div style={{ fontSize: 11, color: colors.textMuted }}>{p.type} • {p.date}</div>
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 10px',
                        background: colors.infoLight,
                        color: colors.info,
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {CATEGORIES.find((c) => c.id === p.categorie)?.label}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12, color: colors.text }}>{p.contenu}</div>
                    <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                      <button
                        onClick={() => like(p.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: p.liked ? colors.primary : colors.textMuted,
                          fontSize: 13,
                          fontWeight: p.liked ? 600 : 500,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {p.liked ? '♥' : '♡'} {p.likes}
                      </button>
                      <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: 13 }}>
                        Commenter ({p.commentaires})
                      </button>
                      <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: 13 }}>
                        Partager
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div>
              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
                position: 'sticky',
                top: 16,
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Tendances</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {['#RushSamedi', '#Fournisseurs2026', '#StaffFidélisation', '#HACCP', '#TVAResto'].map((tag) => (
                    <div key={tag} style={{ fontSize: 13, color: colors.primary, fontWeight: 500, cursor: 'pointer' }}>
                      {tag}
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: colors.border, margin: '16px 0' }} />
                <h3 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 600 }}>Règles de la communauté</h3>
                <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.5 }}>
                  Bienveillance, respect, partage d'expérience. Pas de spam ni de contenu commercial déguisé.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'benchmark' && (
          <motion.div {...fadeIn}>
            <div style={{
              padding: 14,
              background: colors.infoLight,
              border: `1px solid ${colors.info}`,
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              color: colors.info,
            }}>
              Données anonymes agrégées sur 47 restaurants de votre catégorie (brasserie) au Luxembourg.
            </div>

            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              {benchmarks.map((b, i) => {
                const max = Math.max(b.you, b.avg) * 1.15
                return (
                  <div key={b.label} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: i < benchmarks.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{b.label}</span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: b.better ? colors.success : colors.danger,
                      }}>
                        {b.delta} {b.better ? 'au-dessus' : 'en-dessous'}
                      </span>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>
                        <span>Vous</span>
                        <span style={{ fontWeight: 600, color: colors.text }}>{b.you.toLocaleString()} {b.unit}</span>
                      </div>
                      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(b.you / max) * 100}%` }}
                          transition={{ delay: i * 0.08, duration: 0.5 }}
                          style={{ height: '100%', background: b.better ? colors.primary : colors.warning }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>
                        <span>Moyenne catégorie</span>
                        <span style={{ fontWeight: 600, color: colors.text }}>{b.avg.toLocaleString()} {b.unit}</span>
                      </div>
                      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(b.avg / max) * 100}%` }}
                          transition={{ delay: i * 0.08 + 0.1, duration: 0.5 }}
                          style={{ height: '100%', background: '#94a3b8' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {tab === 'groups' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {GROUPS.map((g) => (
              <div key={g.id} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 18,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{g.nom}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{g.membres} membres</div>
                  </div>
                  {g.prive && (
                    <div style={{
                      padding: '2px 8px',
                      background: colors.warningLight,
                      color: colors.warning,
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                    }}>PRIVÉ</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>{g.description}</div>
                <button
                  onClick={() => toggleGroup(g.id)}
                  style={{
                    padding: '8px 14px',
                    background: joinedGroups.has(g.id) ? 'transparent' : colors.primary,
                    color: joinedGroups.has(g.id) ? colors.primary : '#fff',
                    border: `1px solid ${colors.primary}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {joinedGroups.has(g.id) ? 'Membre — Quitter' : (g.prive ? 'Demander accès' : 'Rejoindre')}
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'events' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gap: 12 }}>
            {EVENTS.map((e) => (
              <div key={e.id} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 64, textAlign: 'center',
                    padding: 8, background: colors.primaryLight, borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 10, color: colors.primary, fontWeight: 600 }}>{e.date.split('-')[1]}/{e.date.split('-')[0].slice(2)}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: colors.primary }}>{e.date.split('-')[2]}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{e.titre}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{e.lieu} • {e.participants}/{e.max} inscrits</div>
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      marginTop: 6,
                      background: eventColor(e.type) + '20',
                      color: eventColor(e.type),
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>{e.type}</div>
                  </div>
                </div>
                <button style={{
                  padding: '10px 18px',
                  background: colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  S'inscrire
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'marketplace' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gap: 12 }}>
            {MARKETPLACE.map((m) => (
              <div key={m.id} style={{
                background: colors.card,
                border: `1px solid ${m.urgent ? colors.danger : colors.border}`,
                borderRadius: 12,
                padding: 18,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{
                    padding: '3px 10px',
                    background: mktBg(m.type),
                    color: mktColor(m.type),
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {mktIcon(m.type)}
                  </div>
                  {m.urgent && (
                    <div style={{
                      padding: '3px 10px',
                      background: colors.dangerLight,
                      color: colors.danger,
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                    }}>URGENT</div>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{m.titre}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>{m.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: colors.textMuted }}>
                  <span>Par {m.auteur} • {m.date}</span>
                  <button style={{
                    padding: '6px 12px',
                    background: colors.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}>Contacter</button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'experts' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {EXPERTS.map((e) => (
              <div key={e.nom} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 18,
              }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 26,
                    background: colors.primaryLight, color: colors.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 18,
                  }}>
                    {e.nom.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{e.nom}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{e.specialite}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                      <span style={{ color: colors.warning, fontWeight: 600 }}>★ {e.note}</span>
                      <span style={{ color: colors.textMuted }}>{e.ville}</span>
                      <span style={{ color: colors.primary, fontWeight: 600 }}>{e.tarif}</span>
                    </div>
                  </div>
                </div>
                <button style={{
                  width: '100%',
                  marginTop: 14,
                  padding: 10,
                  background: 'transparent',
                  border: `1px solid ${colors.primary}`,
                  color: colors.primary,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}>Voir profil & réserver</button>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'stories' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gap: 14 }}>
            {SUCCESS_STORIES.map((s) => (
              <div key={s.titre} style={{
                background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.purpleLight})`,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 22,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      background: '#fff',
                      color: colors.primary,
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}>CAS {s.type.toUpperCase()}</div>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{s.titre}</div>
                    <div style={{ fontSize: 13, color: colors.textMuted }}>{s.resume}</div>
                  </div>
                  <div style={{
                    padding: '10px 16px',
                    background: '#fff',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 18,
                    color: colors.primary,
                  }}>
                    {s.metric}
                  </div>
                </div>
                <button style={{
                  marginTop: 14,
                  padding: '8px 14px',
                  background: '#fff',
                  border: `1px solid ${colors.primary}`,
                  color: colors.primary,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}>Lire le cas complet</button>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
