import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS } from '../store/posStore'

type Lang = 'FR' | 'DE' | 'EN' | 'PT'

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  FR: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir', selectProfile: 'Sélectionnez votre profil', enterPin: 'Code PIN pour', forgot: 'Mot de passe oublié ?', wrongPin: 'PIN incorrect', attemptsLeft: 'tentatives restantes', lastLogin: 'Dernière connexion', quickSwitch: 'Accès rapide', welcome: 'Bienvenue', available: 'Disponible', paused: 'En pause', onduty: 'En service' },
  DE: { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', selectProfile: 'Profil wählen', enterPin: 'PIN-Code für', forgot: 'Passwort vergessen?', wrongPin: 'Falsche PIN', attemptsLeft: 'Versuche übrig', lastLogin: 'Letzte Anmeldung', quickSwitch: 'Schnellzugriff', welcome: 'Willkommen', available: 'Verfügbar', paused: 'Pause', onduty: 'Im Dienst' },
  EN: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', selectProfile: 'Select your profile', enterPin: 'PIN code for', forgot: 'Forgot password?', wrongPin: 'Wrong PIN', attemptsLeft: 'attempts left', lastLogin: 'Last login', quickSwitch: 'Quick switch', welcome: 'Welcome', available: 'Available', paused: 'On break', onduty: 'On duty' },
  PT: { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite', selectProfile: 'Selecione seu perfil', enterPin: 'Código PIN para', forgot: 'Esqueceu a senha?', wrongPin: 'PIN incorreto', attemptsLeft: 'tentativas restantes', lastLogin: 'Último acesso', quickSwitch: 'Acesso rápido', welcome: 'Bem-vindo', available: 'Disponível', paused: 'Em pausa', onduty: 'Em serviço' },
}

type StaffStatus = 'available' | 'paused' | 'onduty'

const STATUS_META: Record<StaffStatus, { color: string; dot: string }> = {
  available: { color: '#22c55e', dot: '#22c55e' },
  paused: { color: '#f59e0b', dot: '#f59e0b' },
  onduty: { color: '#3b82f6', dot: '#3b82f6' },
}

const MOCK_META: Record<string, { status: StaffStatus; lastLoginH: number }> = {
  '1': { status: 'onduty', lastLoginH: 2 },
  '2': { status: 'available', lastLoginH: 8 },
  '3': { status: 'paused', lastLoginH: 1 },
  '4': { status: 'available', lastLoginH: 24 },
  '5': { status: 'onduty', lastLoginH: 3 },
  '6': { status: 'available', lastLoginH: 48 },
}

function getGreeting(t: Record<string, string>) {
  const h = new Date().getHours()
  if (h < 12) return t.morning
  if (h < 18) return t.afternoon
  return t.evening
}

export default function PinLoginPage() {
  const staff = usePOS(s => s.staff)
  const loginStaff = usePOS(s => s.loginStaff)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const [attempts, setAttempts] = useState(3)
  const [showForgot, setShowForgot] = useState(false)
  const [showAdminOverride, setShowAdminOverride] = useState(false)
  const [lang, setLang] = useState<Lang>('FR')
  const [now, setNow] = useState(new Date())
  const logoTapsRef = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 })

  const t = TRANSLATIONS[lang]
  const selected = staff.find(s => s.id === selectedId)
  const lastStaffId = staff[0]?.id

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  function handleDigit(d: string) {
    if (pin.length >= 4 || success) return
    const next = pin + d
    setError(false)
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => {
        const ok = loginStaff(next)
        if (!ok) {
          setError(true)
          setShake(true)
          setAttempts(a => Math.max(0, a - 1))
          setTimeout(() => setShake(false), 500)
          setTimeout(() => { setPin(''); setError(false) }, 900)
        } else {
          setSuccess(true)
        }
      }, 120)
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  function handleLogoTap() {
    const now = Date.now()
    const ref = logoTapsRef.current
    if (now - ref.lastTap < 800) ref.count += 1
    else ref.count = 1
    ref.lastTap = now
    if (ref.count >= 3) {
      setShowAdminOverride(true)
      ref.count = 0
    }
  }

  const dateStr = now.toLocaleDateString(lang === 'FR' ? 'fr-FR' : lang === 'DE' ? 'de-DE' : lang === 'PT' ? 'pt-PT' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = now.toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })

  const S = {
    page: {
      display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'center' as const,
      justifyContent: 'flex-start' as const, minHeight: '100vh', padding: '24px 20px 40px',
      background: 'radial-gradient(ellipse at top, #1a1535 0%, #07070d 50%, #030308 100%)',
      color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      position: 'relative' as const, overflow: 'hidden',
    },
    langSwitcher: { position: 'absolute' as const, top: 16, right: 16, display: 'flex', gap: 4, zIndex: 20 },
    langBtn: (active: boolean) => ({
      padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
      background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
      color: active ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
      border: `1px solid ${active ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
      cursor: 'pointer', letterSpacing: '0.05em',
    }),
  }

  if (success) {
    return (
      <div style={{ ...S.page, justifyContent: 'center' as const }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} style={{ textAlign: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 48, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, boxShadow: '0 0 60px rgba(34,197,94,0.5)',
          }}>✓</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#fff' }}>
            {t.welcome}, {selected?.name} !
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Connexion réussie...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

      <div style={S.langSwitcher}>
        {(['FR', 'DE', 'EN', 'PT'] as Lang[]).map(l => (
          <button key={l} style={S.langBtn(lang === l)} onClick={() => setLang(l)}>{l}</button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 680, textAlign: 'center', marginTop: 20, zIndex: 10 }}>
        <motion.div onClick={handleLogoTap} whileTap={{ scale: 0.95 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, cursor: 'pointer', userSelect: 'none' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="2" fill="#818cf8" />
            <rect x="13" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity="0.6" />
            <rect x="3" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity="0.6" />
            <rect x="13" y="13" width="8" height="8" rx="2" fill="#818cf8" />
          </svg>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Creorga</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.2em', marginTop: 2 }}>POINT OF SALE</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            {getGreeting(t)} 👋
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, color: '#e2e8f0' }}>{timeStr}</span>
            <span style={{ textTransform: 'capitalize' }}>{dateStr}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
              Rumelange 12°C ☀
            </span>
          </div>
        </motion.div>
      </div>

      {lastStaffId && !selectedId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ width: '100%', maxWidth: 460, marginTop: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
            {t.quickSwitch}
          </div>
          {(() => {
            const last = staff.find(s => s.id === lastStaffId)
            if (!last) return null
            return (
              <button onClick={() => setSelectedId(last.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14,
                background: `linear-gradient(135deg, ${last.color}22, rgba(255,255,255,0.02))`,
                border: `1px solid ${last.color}44`, cursor: 'pointer', transition: 'all .2s',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: last.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff' }}>
                  {last.name[0]}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{last.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{t.lastLogin}: il y a {MOCK_META[last.id]?.lastLoginH || 2} h</div>
                </div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>›</div>
              </button>
            )
          })()}
        </motion.div>
      )}

      <div style={{ width: '100%', maxWidth: 680, marginTop: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
          {t.selectProfile}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {staff.map((s, idx) => {
            const meta = MOCK_META[s.id] || { status: 'available' as StaffStatus, lastLoginH: 12 }
            const sm = STATUS_META[meta.status]
            const sel = selectedId === s.id
            return (
              <motion.button
                key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.04 }}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                onClick={() => { setSelectedId(s.id); setPin(''); setError(false); setAttempts(3) }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 12px 14px', borderRadius: 18,
                  border: sel ? `2px solid ${s.color}` : '2px solid rgba(255,255,255,0.06)',
                  background: sel ? `linear-gradient(145deg, ${s.color}22, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(8px)', cursor: 'pointer', transition: 'all .2s', position: 'relative',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 54, height: 54, borderRadius: 27, background: `linear-gradient(135deg, ${s.color}, ${s.color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', boxShadow: sel ? `0 0 20px ${s.color}55` : 'none' }}>
                    {s.name[0]}
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, background: sm.dot, border: '2px solid #07070d' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.name}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.role}</div>
                <div style={{ fontSize: 9, padding: '2px 8px', borderRadius: 999, background: `${sm.color}18`, color: sm.color, fontWeight: 600 }}>
                  {t[meta.status]}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                  il y a {meta.lastLoginH} h
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 28, width: '100%' }}
          >
            <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                {t.enterPin} <span style={{ color: selected.color, fontWeight: 700 }}>{selected.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[0, 1, 2, 3].map(i => {
                  const filled = i < pin.length
                  return (
                    <motion.div
                      key={i}
                      animate={error ? { backgroundColor: '#f43f5e', scale: 1.1 } : filled ? { scale: 1 } : {}}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: 18, height: 18, borderRadius: 9,
                        background: error ? '#f43f5e' : filled ? '#818cf8' : 'rgba(255,255,255,0.08)',
                        border: `2px solid ${error ? '#f43f5e' : filled ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
                        boxShadow: filled && !error ? '0 0 10px rgba(129,140,248,0.5)' : 'none',
                        transition: 'background .15s',
                      }}
                    />
                  )
                })}
              </div>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#f43f5e', fontSize: 12, fontWeight: 600 }}>
                  {t.wrongPin} ({attempts} {t.attemptsLeft})
                </motion.div>
              )}
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 12, marginTop: 4 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <motion.button
                  key={d} whileTap={{ scale: 0.88, backgroundColor: 'rgba(129,140,248,0.2)' }}
                  onClick={() => handleDigit(d)}
                  style={{
                    width: 80, height: 80, borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                    color: '#e2e8f0', fontSize: 28, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                  }}
                >{d}</motion.button>
              ))}
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => { setSelectedId(null); setPin('') }} style={{ width: 80, height: 80, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                ESC
              </motion.button>
              <motion.button whileTap={{ scale: 0.88, backgroundColor: 'rgba(129,140,248,0.2)' }} onClick={() => handleDigit('0')} style={{ width: 80, height: 80, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 28, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                0
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} onClick={handleBackspace} style={{ width: 80, height: 80, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>
                ⌫
              </motion.button>
            </div>

            <button onClick={() => setShowForgot(v => !v)} style={{ marginTop: 4, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              {t.forgot}
            </button>

            <AnimatePresence>
              {showForgot && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ maxWidth: 340, padding: 14, borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.5 }}>
                  Contactez votre administrateur :<br/>
                  <strong style={{ color: '#a5b4fc' }}>admin@creorga.lu</strong> · <strong style={{ color: '#a5b4fc' }}>+352 27 99 01 01</strong>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminOverride && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => setShowAdminOverride(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
              style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, #1a1535, #0f0d28)', border: '1px solid rgba(239,68,68,0.4)', textAlign: 'center', maxWidth: 340 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Accès administrateur</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
                Saisissez le code d’urgence à 6 chiffres fourni par le support.
              </p>
              <input type="password" placeholder="••••••" maxLength={6}
                style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 20, textAlign: 'center', letterSpacing: '0.5em', fontFamily: 'monospace' }} />
              <button onClick={() => setShowAdminOverride(false)} style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 'auto', paddingTop: 32, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
        Creorga POS v2.4 · Rumelange, LU
      </div>
    </div>
  )
}
