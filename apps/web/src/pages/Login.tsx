import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  ShoppingCart, CalendarDays, BarChart3, Users, Sparkles, Zap, Shield, Bot,
  Building2, UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

/**
 * Creorga OS — Login / landing page.
 * Premium redesign inspired by Linear · Raycast · Stripe · Vercel.
 * Dark aesthetic, subtle grid + orbs, glassmorphism form, animated stats.
 */

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  confirmPassword: z.string().optional(),
})
type LoginForm = z.infer<typeof loginSchema>
type AuthMode = 'login' | 'register'

/**
 * Trois témoignages clients étaient affichés ici — « Sophie Lentz, gérante de
 * la Brasserie du Centre », « Claire Dubois, directrice du Bouchon Gourmand »,
 * avec des résultats chiffrés (« +8 % de marge en trois mois »). Ces personnes
 * et ces établissements n'existent pas. Une recommandation attribuée à
 * quelqu'un qui ne l'a jamais donnée n'est pas un habillage : c'est un faux,
 * sur la page la plus publique du produit.
 *
 * À la place : ce que le produit fait réellement, sans le mettre dans la
 * bouche de personne. Les vrais témoignages viendront des vrais clients.
 */
const ENGAGEMENTS = [
  { titre: 'Chaque établissement reste séparé', texte: 'Les clients, salles, menus, commandes, publicités et réglages sont filtrés par entreprise.' },
  { titre: 'Aucun faux envoi', texte: 'Un email ou un paiement n’est annoncé comme réussi qu’après confirmation du fournisseur concerné.' },
  { titre: 'Un portail QR réellement testable', texte: 'Chaque lien encode l’établissement et la table afin d’ouvrir le bon menu et la bonne configuration.' },
]

const FEATURES = [
  { Icon: ShoppingCart,  title: 'Caisse tactile',      desc: 'Commandes, tables et encaissements reliés aux données réelles' },
  { Icon: CalendarDays,  title: 'Plan de salle',       desc: 'Tables, chaises et zones sauvegardées par établissement' },
  { Icon: BarChart3,     title: 'Pilotage',            desc: 'Ventes, factures, dépenses et TVA à partir des écritures enregistrées' },
  { Icon: Users,         title: 'Fichier clients',     desc: 'Création, modification et suppression contrôlées des fiches' },
  { Icon: Bot,           title: 'Assistant local',     desc: 'Commandes affichées uniquement lorsqu’elles sont réellement disponibles' },
  { Icon: Shield,        title: 'Accès isolés',        desc: 'Connexion email et contrôle d’appartenance à chaque société' },
]

/**
 * Quatre chiffres, tous vérifiables.
 *
 * Les précédents ne l'étaient pas : « 33 modules » (il y en a 18 dans
 * `moduleStore.ts`), « 6 passerelles paiement » (aucune n'est active — cf. la
 * page Intégrations), « <200 ms de latence POS » (jamais mesuré).
 */
/**
 * Pré-remplissage des identifiants : DÉVELOPPEMENT UNIQUEMENT.
 *
 * La version précédente les mettait en dur dans tous les cas. En production,
 * cela transformait la page publique en porte ouverte : n'importe quel visiteur
 * de creorga.n8nautomatisations.org arrivait sur un formulaire déjà rempli avec
 * le compte du propriétaire et n'avait plus qu'à cliquer « Se connecter ».
 * Le mot de passe partait en clair dans le bundle JavaScript, donc lisible par
 * quiconque ouvrait les outils du navigateur.
 *
 * `import.meta.env.DEV` vaut false dans tout build `vite build`.
 */
const PRE_REMPLISSAGE = import.meta.env.DEV
  // Adresse seulement : le mot de passe reste hors du dépôt, même ici.
  // Un mot de passe écrit dans le code finit toujours par sortir — c'est
  // exactement ce qui est arrivé à `Demo1234!`.
  ? { email: 'bryanl1994.bl@gmail.com', password: '', firstName: '', lastName: '', companyName: '', confirmPassword: '' }
  : { email: '', password: '', firstName: '', lastName: '', companyName: '', confirmPassword: '' }

const STATS = [
  { value: 'Email', label: 'connexion' },
  { value: 'QR',  label: 'portail client' },
  { value: '16', label: 'jeux retenus' },
  { value: '5 max', label: 'par catégorie' },
]

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [engagementIdx, setEngagementIdx] = useState(0)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const id = setInterval(() => setEngagementIdx((i) => (i + 1) % ENGAGEMENTS.length), 6000)
    return () => clearInterval(id)
  }, [])

  const { register, handleSubmit, getValues, reset, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: PRE_REMPLISSAGE,
  })

  const changerMode = (next: AuthMode) => {
    const email = getValues('email')
    setMode(next)
    setShowPassword(false)
    reset({ ...PRE_REMPLISSAGE, email, password: '' })
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      if (mode === 'register') {
        const champs = [
          ['firstName', data.firstName, 'Prénom requis'],
          ['lastName', data.lastName, 'Nom requis'],
          ['companyName', data.companyName, 'Nom de l’établissement requis'],
        ] as const
        let invalide = false
        for (const [champ, valeur, message] of champs) {
          if (!valeur?.trim()) {
            setError(champ, { type: 'required', message })
            invalide = true
          }
        }
        if (data.password.length < 8) {
          setError('password', { type: 'minLength', message: '8 caractères minimum' })
          invalide = true
        }
        if (data.confirmPassword !== data.password) {
          setError('confirmPassword', { type: 'validate', message: 'Les mots de passe ne correspondent pas' })
          invalide = true
        }
        if (invalide) return
      }

      const res = mode === 'register'
        ? await api.post('/auth/register', {
            email: data.email,
            password: data.password,
            firstName: data.firstName?.trim(),
            lastName: data.lastName?.trim(),
            companyName: data.companyName?.trim(),
          })
        : await api.post('/auth/login', { email: data.email, password: data.password })
      const { accessToken, user, companies } = res.data
      setAuth({ accessToken, user, companies })
      toast.success(mode === 'register' ? 'Votre espace Creorga est prêt !' : `Bienvenue ${user.firstName} !`, { icon: '🎉' })
      navigate(mode === 'register' ? '/setup' : '/welcome')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || (mode === 'register' ? 'Inscription impossible' : 'Identifiants incorrects'))
    }
  }

  const engagementCourant = ENGAGEMENTS[engagementIdx]

  return (
    <div style={rootStyle}>
      {/* ═══ Animated background ═══ */}
      <div aria-hidden="true" style={restaurantFlowBackground} />
      <BackgroundOrbs />
      <GridPattern />

      {/* ═══ Top navigation ═══ */}
      <nav className="creorga-login-nav" style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.3 }}>Creorga</div>
            <div style={{ fontSize: 10, color: '#a78bfa', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Restaurant OS · v4</div>
          </div>
        </div>
        <div className="creorga-login-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          
          <a href="/demo" style={navLink}>Démo live</a>
          <div style={{ width: 1, height: 20, background: 'rgba(148,163,184,0.2)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Connexion sécurisée par email
          </span>
        </div>
      </nav>

      {/* ═══ Main content ═══ */}
      <main className="creorga-login-main" style={mainStyle}>
        {/* ── LEFT : hero + features + testimonial ── */}
        <section className="creorga-login-left" style={leftStyle}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div style={badgeStyle}>
              <Sparkles size={12} /> Portail et données isolés par établissement
            </div>

            {/* Headline */}
            <h1 className="creorga-login-headline" style={headlineStyle}>
              Le système d'exploitation<br />
              de <span style={gradientText}>votre restaurant.</span>
            </h1>

            <p style={subheadStyle}>
              Caisse, plan de salle, planning, factures, clients, comptabilité et portail QR,
              réunis pour les restaurants, bars et cafés du Luxembourg.
            </p>

            {/* Feature grid */}
            <div className="creorga-login-features" style={featureGrid}>
              {FEATURES.map((f, i) => (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                  style={featureCardStyle}
                >
                  <div style={featureIconStyle}><f.Icon size={16} /></div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats row */}
            <div className="creorga-login-stats" style={statsRowStyle}>
              {STATS.map((s) => (
                <div key={s.label} style={statBlock}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: -1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Engagements — à la place des faux témoignages (cf. ENGAGEMENTS) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={engagementIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                style={testimonialCardStyle}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                  {engagementCourant.titre}
                </div>
                <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  {engagementCourant.texte}
                </p>
                <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
                  {ENGAGEMENTS.map((_, i) => (
                    <span key={i} style={{
                      width: i === engagementIdx ? 16 : 4, height: 4, borderRadius: 2,
                      background: i === engagementIdx ? '#8b5cf6' : 'rgba(148,163,184,0.3)',
                      transition: 'all .3s',
                    }} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </section>

        {/* ── RIGHT : login card ── */}
        <section className="creorga-login-right" style={rightStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={cardStyle}
          >
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 11, background: 'rgba(148,163,184,0.08)', marginBottom: 20 }}>
                <button type="button" onClick={() => changerMode('login')} style={modeTabStyle(mode === 'login')}>Connexion</button>
                <button type="button" onClick={() => changerMode('register')} style={modeTabStyle(mode === 'register')}>Créer mon espace</button>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: -0.5 }}>
                {mode === 'login' ? <>Bon retour <span style={{ fontSize: 20 }}>👋</span></> : <>Bienvenue chez Creorga</>}
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {mode === 'login'
                  ? 'Connectez-vous avec votre adresse email.'
                  : 'Créez votre espace professionnel en quelques secondes.'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'register' && (
                <>
                  <div className="creorga-login-name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label htmlFor="auth-first-name" style={labelStyle}>Prénom</label>
                      <div style={inputWrap}>
                        <UserRound size={16} style={iconLeft} />
                        <input id="auth-first-name" {...register('firstName')} autoComplete="given-name" style={inputStyle} />
                      </div>
                      {errors.firstName && <span style={errorStyle}>{errors.firstName.message}</span>}
                    </div>
                    <div>
                      <label htmlFor="auth-last-name" style={labelStyle}>Nom</label>
                      <div style={inputWrap}>
                        <UserRound size={16} style={iconLeft} />
                        <input id="auth-last-name" {...register('lastName')} autoComplete="family-name" style={inputStyle} />
                      </div>
                      {errors.lastName && <span style={errorStyle}>{errors.lastName.message}</span>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="auth-company-name" style={labelStyle}>Nom de l’établissement</label>
                    <div style={inputWrap}>
                      <Building2 size={16} style={iconLeft} />
                      <input id="auth-company-name" {...register('companyName')} placeholder="Mon restaurant" autoComplete="organization" style={inputStyle} />
                    </div>
                    {errors.companyName && <span style={errorStyle}>{errors.companyName.message}</span>}
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label htmlFor="auth-email" style={labelStyle}>Adresse email</label>
                <div style={inputWrap}>
                  <Mail size={16} style={iconLeft} />
                  <input
                    id="auth-email"
                    {...register('email')}
                    type="email"
                    placeholder="vous@restaurant.lu"
                    autoComplete="email"
                    style={inputStyle}
                  />
                </div>
                {errors.email && <span style={errorStyle}>{errors.email.message}</span>}
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="auth-password" style={labelStyle}>Mot de passe</label>
                </div>
                <div style={inputWrap}>
                  <Lock size={16} style={iconLeft} />
                  <input
                    id="auth-password"
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={iconRightBtn}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span style={errorStyle}>{errors.password.message}</span>}
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-confirm-password" style={labelStyle}>Confirmer le mot de passe</label>
                  <div style={inputWrap}>
                    <Lock size={16} style={iconLeft} />
                    <input
                      id="auth-confirm-password"
                      {...register('confirmPassword')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      style={inputStyle}
                    />
                  </div>
                  {errors.confirmPassword && <span style={errorStyle}>{errors.confirmPassword.message}</span>}
                </div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                style={{
                  ...submitStyle,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>
                  <span>{mode === 'register' ? 'Créer mon espace' : 'Se connecter'}</span>
                  <ArrowRight size={16} />
                </>}
              </motion.button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
              {mode === 'login' ? 'Nouveau sur Creorga ? ' : 'Vous avez déjà un compte ? '}
              <button type="button" onClick={() => changerMode(mode === 'login' ? 'register' : 'login')} style={modeLinkStyle}>
                {mode === 'login' ? 'Créer mon espace' : 'Me connecter'}
              </button>
            </div>

            {/* Le rappel « comptes de démo pré-remplis » n'a de sens qu'en
                développement : en production les champs sont vides, et l'y
                laisser reviendrait à annoncer publiquement qu'un compte de
                démonstration attend d'être essayé. */}
            {import.meta.env.DEV && mode === 'login' && (
              <div style={demoHintStyle}>
                <Zap size={12} /> Comptes de démo pré-remplis — cliquez simplement <strong>Se connecter</strong>
              </div>
            )}
          </motion.div>

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#64748b' }}>
            © 2026 Creorga · Rumelange, Luxembourg ·{' '}
            <a href="mailto:contact@n8nautomatisations.org?subject=Informations%20l%C3%A9gales%20Creorga" style={{ color: '#94a3b8', textDecoration: 'none' }}>
              Informations légales et données personnelles
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Background visuals
// ════════════════════════════════════════════════════════════════════════════
function BackgroundOrbs() {
  return (
    <>
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity }}
        style={{
          position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
        }} />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity }}
        style={{
          position: 'absolute', bottom: '-10%', right: '-10%', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
          filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
        }} />
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
        style={{
          position: 'absolute', top: '40%', left: '30%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
        }} />
    </>
  )
}

function GridPattern() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.4,
      backgroundImage:
        'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
      backgroundSize: '60px 60px',
      maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
      WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
    }} />
  )
}

function LogoMark() {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
      position: 'relative',
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>C</span>
      <span style={{
        position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%',
        background: '#10b981', border: '2px solid #0a0a1a',
      }} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════════
const rootStyle: React.CSSProperties = {
  minHeight: '100vh', position: 'relative', overflow: 'hidden',
  background: '#0a0a1a',
  color: '#f1f5f9',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
}

const restaurantFlowBackground: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
  backgroundImage: 'linear-gradient(90deg, rgba(10,10,26,.3), rgba(10,10,26,.62)), url(/creorga-restaurant-flow-v1.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: 0.58,
  filter: 'saturate(.9) contrast(1.03)',
}

const navStyle: React.CSSProperties = {
  position: 'relative', zIndex: 10,
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '20px 40px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  backdropFilter: 'blur(10px)',
}

const navLink: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, color: '#94a3b8', textDecoration: 'none',
  fontSize: 13, fontWeight: 500, transition: 'color .2s',
}

const mainStyle: React.CSSProperties = {
  position: 'relative', zIndex: 10,
  display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40,
  padding: '40px 60px', minHeight: 'calc(100vh - 80px)',
  alignItems: 'center',
}

const leftStyle: React.CSSProperties = { maxWidth: 640 }
const rightStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' }

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 12px', borderRadius: 999,
  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
  color: '#c4b5fd', fontSize: 11, fontWeight: 600, marginBottom: 24,
}

const headlineStyle: React.CSSProperties = {
  fontSize: 52, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5,
  color: '#f1f5f9', margin: '0 0 18px',
}

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, #a78bfa, #ec4899, #f472b6)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const subheadStyle: React.CSSProperties = {
  fontSize: 16, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 32px', maxWidth: 520,
}

const featureGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 28,
}

const featureCardStyle: React.CSSProperties = {
  display: 'flex', gap: 12, padding: 14,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12, backdropFilter: 'blur(8px)',
}

const featureIconStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
  color: '#c4b5fd',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const statsRowStyle: React.CSSProperties = {
  display: 'flex', gap: 30, marginBottom: 28, padding: '16px 0',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

const statBlock: React.CSSProperties = {}

const testimonialCardStyle: React.CSSProperties = {
  padding: 20,
  background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)',
  borderRadius: 16, backdropFilter: 'blur(8px)',
}

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: 'rgba(15,15,35,0.7)', backdropFilter: 'blur(20px)',
  border: '1px solid rgba(139,92,246,0.2)',
  borderRadius: 20, padding: 32, boxSizing: 'border-box',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.05)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6,
}

const inputWrap: React.CSSProperties = { position: 'relative' }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 40px 0 38px',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none',
  transition: 'all .15s', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const iconLeft: React.CSSProperties = {
  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
  color: '#94a3b8', pointerEvents: 'none',
}

const iconRightBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8',
  padding: 4, display: 'flex', alignItems: 'center',
}

const errorStyle: React.CSSProperties = {
  display: 'block', marginTop: 4, fontSize: 11, color: '#fca5a5',
}

const linkStyle: React.CSSProperties = {
  fontSize: 11, color: '#a78bfa', textDecoration: 'none', fontWeight: 500,
}

const submitStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', height: 46, borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  color: '#fff', fontWeight: 700, fontSize: 14,
  boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
  marginTop: 6,
}

const modeTabStyle = (active: boolean): React.CSSProperties => ({
  height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
  background: active ? 'linear-gradient(135deg,rgba(139,92,246,.9),rgba(236,72,153,.85))' : 'transparent',
  color: active ? '#fff' : '#94a3b8',
  boxShadow: active ? '0 5px 16px rgba(139,92,246,.22)' : 'none',
})

const modeLinkStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, color: '#a78bfa', fontWeight: 700, cursor: 'pointer', fontSize: 12,
}

const demoHintStyle: React.CSSProperties = {
  marginTop: 16, padding: '8px 12px',
  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
  borderRadius: 8, fontSize: 11, color: '#6ee7b7',
  display: 'flex', alignItems: 'center', gap: 6,
}
