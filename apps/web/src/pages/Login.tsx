import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  CalendarDays,
  BarChart3,
  Globe,
  Sun,
  Moon,
  Quote,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginForm = z.infer<typeof loginSchema>

const testimonials = [
  {
    quote:
      'Creorga a transformé la gestion quotidienne de notre brasserie. Intuitif et puissant.',
    author: 'Sophie Lentz',
    role: 'Gérante — Brasserie du Centre, Luxembourg-Ville',
  },
  {
    quote:
      'La solution POS la plus fluide que nous ayons testée. Nos équipes l\'ont adoptée en un jour.',
    author: 'Marc Weber',
    role: 'Propriétaire — Café um Rond-Point, Rumelange',
  },
  {
    quote:
      'Les analytics nous permettent de prendre de meilleures décisions chaque semaine.',
    author: 'Claire Dubois',
    role: 'Directrice — Le Bouchon Gourmand, Esch-sur-Alzette',
  },
]

const features = [
  { icon: ShoppingCart, label: 'POS tactile', desc: 'Caisse rapide et intuitive' },
  { icon: CalendarDays, label: 'Réservations', desc: 'Plan de salle interactif' },
  { icon: BarChart3, label: 'Analytics', desc: 'Tableaux de bord en temps réel' },
]

const languages = ['FR', 'DE', 'EN', 'PT'] as const

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [lang, setLang] = useState<(typeof languages)[number]>('FR')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const id = setInterval(
      () => setTestimonialIdx((i) => (i + 1) % testimonials.length),
      5000,
    )
    return () => clearInterval(id)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@creorga.local', password: 'Admin1234!' },
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      })
      const { accessToken, user, companies } = res.data
      setAuth({ accessToken, user, companies })
      toast.success(`Bienvenue ${user.firstName} !`)
      navigate('/welcome')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Identifiants incorrects'
      toast.error(msg)
    }
  }

  const inputWrapStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    padding: '0 14px 0 44px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#1e293b',
    fontSize: 14.5,
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  }

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    pointerEvents: 'none',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        background: '#fff',
        color: '#1e293b',
      }}
    >
      {/* LEFT PANEL */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'none',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #312e81 0%, #4338ca 35%, #6366f1 70%, #8b5cf6 100%)',
          color: '#fff',
          padding: '56px 60px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="login-left-panel"
      >
        {/* Dot pattern background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
        <motion.div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)',
            top: '-10%',
            right: '-10%',
            pointerEvents: 'none',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Top: Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Creorga
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.75, letterSpacing: '0.14em' }}>
              RESTAURANT OS
            </div>
          </div>
        </motion.div>

        {/* Middle: Hero + Features */}
        <div style={{ position: 'relative' }}>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: 16,
              maxWidth: 460,
            }}
          >
            Plateforme de gestion pour restaurants.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: 15.5, opacity: 0.85, marginBottom: 40, maxWidth: 440 }}
          >
            POS, réservations, stocks, analytics — tout ce qu\'il vous faut pour faire
            grandir votre établissement au Luxembourg.
          </motion.p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <f.icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom: Testimonial carousel */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{
            position: 'relative',
            padding: 24,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.18)',
            minHeight: 150,
          }}
        >
          <Quote
            size={28}
            style={{ opacity: 0.5, marginBottom: 10 }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                  marginBottom: 14,
                  fontWeight: 500,
                }}
              >
                « {testimonials[testimonialIdx].quote} »
              </p>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {testimonials[testimonialIdx].author}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {testimonials[testimonialIdx].role}
              </div>
            </motion.div>
          </AnimatePresence>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                style={{
                  width: i === testimonialIdx ? 22 : 7,
                  height: 7,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background:
                    i === testimonialIdx ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.3s',
                }}
                aria-label={`Témoignage ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          background: '#fff',
        }}
      >
        {/* Top bar: language + theme */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 8px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <Globe size={14} style={{ color: '#64748b', marginLeft: 2 }} />
            {languages.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: lang === l ? '#6366f1' : 'transparent',
                  color: lang === l ? '#fff' : '#64748b',
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label="Basculer le thème"
          >
            {theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#1e293b',
              marginBottom: 6,
            }}
          >
            Bon retour <span style={{ display: 'inline-block' }}>👋</span>
          </h1>
          <p style={{ fontSize: 14.5, color: '#64748b', marginBottom: 32 }}>
            Connectez-vous pour accéder à votre espace de travail.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 7,
                }}
              >
                Adresse email
              </label>
              <div style={inputWrapStyle}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  placeholder="nom@entreprise.lu"
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1'
                    e.currentTarget.style.boxShadow =
                      '0 0 0 4px rgba(99,102,241,0.12)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 7,
                }}
              >
                Mot de passe
              </label>
              <div style={inputWrapStyle}>
                <Lock size={18} style={iconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1'
                    e.currentTarget.style.boxShadow =
                      '0 0 0 4px rgba(99,102,241,0.12)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember + forgot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 2,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: 50,
                marginTop: 8,
                borderRadius: 12,
                border: 'none',
                background:
                  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.75 : 1,
                boxShadow:
                  '0 8px 24px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'transform 0.15s',
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = 'scale(0.98)')
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={18}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              margin: '28px 0 20px',
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              ou continuer avec
            </span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { name: 'Google', color: '#ea4335', initial: 'G' },
              { name: 'Apple', color: '#1e293b', initial: '' },
              { name: 'Microsoft', color: '#00a4ef', initial: 'M' },
            ].map((o) => (
              <button
                key={o.name}
                type="button"
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 11,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#334155',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: o.color,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {o.initial || ''}
                </span>
                {o.name}
              </button>
            ))}
          </div>

          {/* Signup link */}
          <p
            style={{
              textAlign: 'center',
              marginTop: 28,
              fontSize: 13.5,
              color: '#64748b',
            }}
          >
            Pas encore de compte ?{' '}
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6366f1',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Demander un accès
            </button>
          </p>
        </motion.div>

        <p
          style={{
            position: 'absolute',
            bottom: 16,
            fontSize: 11.5,
            color: '#94a3b8',
          }}
        >
          © 2026 Creorga · Rumelange, Luxembourg
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) {
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
