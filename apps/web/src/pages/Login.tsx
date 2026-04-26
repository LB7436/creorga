import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  ShoppingCart, CalendarDays, BarChart3, Users, Sparkles, Zap, Shield, Bot,
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
})
type LoginForm = z.infer<typeof loginSchema>

const TESTIMONIALS = [
  { quote: 'Creorga a transformé notre brasserie. Intuitif, puissant, et toujours en ligne.', author: 'Sophie Lentz', role: 'Gérante · Brasserie du Centre', loc: 'Luxembourg-Ville' },
  { quote: 'La solution POS la plus fluide que nous ayons testée. Adoptée en un jour par toute l\'équipe.', author: 'Marc Weber', role: 'Propriétaire · Café um Rond-Point', loc: 'Rumelange' },
  { quote: 'Les analytics en temps réel ont boosté notre marge de 8 % en trois mois.', author: 'Claire Dubois', role: 'Directrice · Le Bouchon Gourmand', loc: 'Esch-sur-Alzette' },
]

const FEATURES = [
  { Icon: ShoppingCart,  title: 'POS tactile',      desc: 'Caisse offline-first avec 200+ produits préchargés' },
  { Icon: CalendarDays,  title: 'Plan de salle',    desc: 'Tables, chaises, transferts en temps réel' },
  { Icon: BarChart3,     title: 'Analytics',        desc: 'CA, marges, TVA luxembourgeoise automatiques' },
  { Icon: Users,         title: 'Multi-tenants',    desc: 'Jusqu\'à 100 établissements sous une même licence' },
  { Icon: Bot,           title: 'Assistant IA',     desc: 'Gemma 2B local — 100 % privé, zéro dépendance cloud' },
  { Icon: Shield,        title: 'HACCP + CNPD',     desc: 'Conformité Luxembourg out-of-the-box' },
]

const STATS = [
  { value: '33', label: 'modules intégrés' },
  { value: '6',  label: 'passerelles paiement' },
  { value: '5',  label: 'apps unifiées' },
  { value: '<200ms', label: 'latence POS' },
]

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 6000)
    return () => clearInterval(id)
  }, [])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@creorga.local', password: 'Admin1234!' },
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      const { accessToken, user, companies } = res.data
      setAuth({ accessToken, user, companies })
      toast.success(`Bienvenue ${user.firstName} !`, { icon: '🎉' })
      navigate('/welcome')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Identifiants incorrects')
    }
  }

  const currentTestimonial = TESTIMONIALS[testimonialIdx]

  return (
    <div style={rootStyle}>
      {/* ═══ Animated background ═══ */}
      <BackgroundOrbs />
      <GridPattern />

      {/* ═══ Top navigation ═══ */}
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.3 }}>Creorga</div>
            <div style={{ fontSize: 10, color: '#a78bfa', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Restaurant OS · v2.0</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="https://creorga.lu" style={navLink}>À propos</a>
          <a href="/demo" style={navLink}>Démo live</a>
          <div style={{ width: 1, height: 20, background: 'rgba(148,163,184,0.2)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Tous services en ligne
          </span>
        </div>
      </nav>

      {/* ═══ Main content ═══ */}
      <main style={mainStyle}>
        {/* ── LEFT : hero + features + testimonial ── */}
        <section style={leftStyle}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div style={badgeStyle}>
              <Sparkles size={12} /> Nouveau · IA locale Gemma 2B intégrée
            </div>

            {/* Headline */}
            <h1 style={headlineStyle}>
              Le système d'exploitation<br />
              de <span style={gradientText}>votre restaurant.</span>
            </h1>

            <p style={subheadStyle}>
              POS, réservations, stocks, HACCP, comptabilité, IA — une seule plateforme,
              optimisée pour les restaurants, bars et cafés du Luxembourg.
            </p>

            {/* Feature grid */}
            <div style={featureGrid}>
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
            <div style={statsRowStyle}>
              {STATS.map((s) => (
                <div key={s.label} style={statBlock}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: -1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Testimonial carousel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                style={testimonialCardStyle}
              >
                <div style={{ fontSize: 28, lineHeight: 0.5, color: '#a78bfa', marginBottom: 10 }}>"</div>
                <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                  {currentTestimonial.quote}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 13,
                  }}>
                    {currentTestimonial.author.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{currentTestimonial.author}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{currentTestimonial.role} · {currentTestimonial.loc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {TESTIMONIALS.map((_, i) => (
                      <span key={i} style={{
                        width: i === testimonialIdx ? 16 : 4, height: 4, borderRadius: 2,
                        background: i === testimonialIdx ? '#8b5cf6' : 'rgba(148,163,184,0.3)',
                        transition: 'all .3s',
                      }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </section>

        {/* ── RIGHT : login card ── */}
        <section style={rightStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={cardStyle}
          >
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: -0.5 }}>
                Bon retour <span style={{ fontSize: 20 }}>👋</span>
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                Connectez-vous pour accéder à votre espace de travail.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email */}
              <div>
                <label style={labelStyle}>Adresse email</label>
                <div style={inputWrap}>
                  <Mail size={16} style={iconLeft} />
                  <input
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
                  <label style={labelStyle}>Mot de passe</label>
                  <a href="#" style={linkStyle}>Mot de passe oublié ?</a>
                </div>
                <div style={inputWrap}>
                  <Lock size={16} style={iconLeft} />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={iconRightBtn}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span style={errorStyle}>{errors.password.message}</span>}
              </div>

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
                  <span>Se connecter</span>
                  <ArrowRight size={16} />
                </>}
              </motion.button>

              {/* Divider */}
              <div style={{ position: 'relative', margin: '4px 0', textAlign: 'center' }}>
                <div style={{ height: 1, background: 'rgba(148,163,184,0.15)' }} />
                <span style={{
                  position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                  padding: '0 12px', background: '#0a0a1a', color: '#64748b', fontSize: 11, fontWeight: 600,
                }}>ou continuer avec</span>
              </div>

              {/* OAuth */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {['Google', 'Apple', 'Microsoft'].map((p) => (
                  <button key={p} type="button" style={oauthStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                    {p}
                  </button>
                ))}
              </div>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
              Pas encore de compte ? <a href="#" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Demander un accès</a>
            </div>

            {/* Quick demo hint */}
            <div style={demoHintStyle}>
              <Zap size={12} /> Comptes de démo pré-remplis — cliquez simplement <strong>Se connecter</strong>
            </div>
          </motion.div>

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#64748b' }}>
            © 2026 Creorga · Rumelange, Luxembourg · <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Mentions légales</a> · <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>CNPD</a>
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
  borderRadius: 20, padding: 32,
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

const oauthStyle: React.CSSProperties = {
  height: 42, borderRadius: 10,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.15)',
  color: '#cbd5e1', cursor: 'pointer', fontWeight: 600, fontSize: 12,
  transition: 'all .15s',
}

const demoHintStyle: React.CSSProperties = {
  marginTop: 16, padding: '8px 12px',
  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
  borderRadius: 8, fontSize: 11, color: '#6ee7b7',
  display: 'flex', alignItems: 'center', gap: 6,
}
