import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PALETTE = {
  bg: '#fafafa',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#64748b',
  amber: '#f59e0b',
  amberBg: '#fef3c7',
  amberDark: '#b45309',
  green: '#10b981',
  greenBg: '#d1fae5',
  blue: '#3b82f6',
  blueBg: '#dbeafe',
  purple: '#8b5cf6',
  purpleBg: '#ede9fe',
  pink: '#ec4899',
  pinkBg: '#fce7f3',
  orange: '#ea580c',
}

const REFERRAL_CODE = 'CAFE-RONDPOINT-12345'
const REFERRAL_URL = `https://app.creorga.com/r/${REFERRAL_CODE}`

interface Referral {
  id: string
  name: string
  email: string
  status: 'invited' | 'signed' | 'active'
  date: string
  credit: number
}

const REFERRALS: Referral[] = [
  { id: 'r1', name: 'Pizzeria Bella Napoli', email: 'marco@bellanapoli.lu', status: 'active', date: '12 avril 2026', credit: 100 },
  { id: 'r2', name: 'Boulangerie Schmitt', email: 'contact@schmitt-bakery.lu', status: 'active', date: '04 avril 2026', credit: 100 },
  { id: 'r3', name: 'Restaurant L\'Atelier', email: 'jean@latelier-dudelange.lu', status: 'active', date: '28 mars 2026', credit: 100 },
  { id: 'r4', name: 'Café des Arts', email: 'hello@cafedesarts.lu', status: 'signed', date: '15 avril 2026', credit: 0 },
  { id: 'r5', name: 'Brasserie Du Pont', email: 'info@brasserieeschs.lu', status: 'signed', date: '17 avril 2026', credit: 0 },
  { id: 'r6', name: 'Food Truck Luxy', email: 'nico@luxytruck.lu', status: 'invited', date: '18 avril 2026', credit: 0 },
  { id: 'r7', name: 'Tea Room Madeleine', email: 'madeleine@tearoom.lu', status: 'invited', date: '18 avril 2026', credit: 0 },
]

const LEADERBOARD = [
  { rank: 1, name: 'Restaurant Le Pavillon', referrals: 18, credit: 1800, badge: '🏆' },
  { rank: 2, name: 'Chaîne Quick Luxembourg', referrals: 14, credit: 1400, badge: '🥈' },
  { rank: 3, name: 'Boulangerie Paul Belval', referrals: 11, credit: 1100, badge: '🥉' },
  { rank: 4, name: 'Pizza Hut Kirchberg', referrals: 8, credit: 800, badge: '' },
  { rank: 5, name: 'Café um Rond-Point Rumelange', referrals: 3, credit: 300, badge: '', highlight: true },
]

const TIERS = [
  { threshold: 1, reward: '50€ crédit', icon: '🎁', color: PALETTE.blue, bg: PALETTE.blueBg, description: '1 ami parrainé' },
  { threshold: 3, reward: '200€ + abo Pro 1 mois', icon: '✨', color: PALETTE.purple, bg: PALETTE.purpleBg, description: '3 amis parrainés', current: true },
  { threshold: 5, reward: '500€ + formation offerte', icon: '🚀', color: PALETTE.amber, bg: PALETTE.amberBg, description: '5 amis parrainés' },
  { threshold: 10, reward: '1000€ + upgrade Business', icon: '👑', color: PALETTE.pink, bg: PALETTE.pinkBg, description: '10 amis parrainés' },
]

const EMAIL_TEMPLATES = [
  {
    id: 'friendly',
    label: 'Amical 😊',
    subject: 'Tu devrais vraiment tester Creorga OS',
    body: `Salut,\n\nJe te recommande Creorga OS, le logiciel qu'on utilise au Café um Rond-Point. Ça a vraiment changé notre quotidien — POS, stocks, RH, compta, tout est centralisé.\n\nVoici mon lien de parrainage (on gagne 100€ de crédit tous les deux) :\n${REFERRAL_URL}\n\nN'hésite pas si tu as des questions !\n\nÀ bientôt`,
  },
  {
    id: 'pro',
    label: 'Professionnel 💼',
    subject: 'Recommandation : solution de gestion pour votre établissement',
    body: `Bonjour,\n\nDans le cadre de nos échanges, je me permets de vous recommander Creorga OS — la plateforme que nous utilisons pour piloter notre établissement.\n\nElle couvre POS, comptabilité, HACCP, réservations et RH avec une conformité luxembourgeoise complète.\n\nLien avec offre préférentielle :\n${REFERRAL_URL}\n\nCordialement`,
  },
  {
    id: 'short',
    label: 'Court & direct ⚡',
    subject: 'Un outil à tester',
    body: `Teste Creorga OS, franchement top :\n${REFERRAL_URL}\n\n100€ offerts à l'inscription via mon lien.`,
  },
]

const STORIES = [
  { name: 'Marie — Boulangerie La Fleur', quote: 'J\'ai gagné 1200€ en parrainant mes confrères du réseau CAFÉ LUX.', amount: 1200, photo: '👩‍🍳' },
  { name: 'Thierry — Pizzeria Don Pablo', quote: 'Parrainer 5 restaurants voisins a payé mon abonnement annuel.', amount: 500, photo: '👨‍🍳' },
  { name: 'Sophie — Tea Room Charlotte', quote: 'Je recommande à chaque rencontre, c\'est devenu une habitude.', amount: 800, photo: '☕' },
]

function statusMeta(s: Referral['status']) {
  switch (s) {
    case 'invited': return { label: 'Invité', color: PALETTE.muted, bg: '#f3f4f6' }
    case 'signed': return { label: 'Inscrit', color: PALETTE.blue, bg: PALETTE.blueBg }
    case 'active': return { label: 'Actif ✓', color: PALETTE.green, bg: PALETTE.greenBg }
  }
}

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0].id)
  const [showQR, setShowQR] = useState(false)
  const [customEmail, setCustomEmail] = useState('')

  const tmpl = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate)!

  const stats = useMemo(() => {
    const active = REFERRALS.filter((r) => r.status === 'active').length
    const signed = REFERRALS.filter((r) => r.status !== 'invited').length
    const earned = REFERRALS.reduce((sum, r) => sum + r.credit, 0)
    return { active, signed, earned, rank: 'Top 10%' }
  }, [])

  const copyCode = () => {
    navigator.clipboard?.writeText(REFERRAL_CODE).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const copyLink = () => {
    navigator.clipboard?.writeText(REFERRAL_URL).catch(() => {})
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const shareButtons = [
    { label: 'Email', icon: '✉️', color: '#64748b', href: `mailto:?subject=${encodeURIComponent(tmpl.subject)}&body=${encodeURIComponent(tmpl.body)}` },
    { label: 'SMS', icon: '💬', color: '#10b981', href: `sms:?body=${encodeURIComponent('Teste Creorga : ' + REFERRAL_URL)}` },
    { label: 'WhatsApp', icon: '🟢', color: '#25d366', href: `https://wa.me/?text=${encodeURIComponent('Teste Creorga OS — ' + REFERRAL_URL)}` },
    { label: 'Facebook', icon: '📘', color: '#1877f2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(REFERRAL_URL)}` },
    { label: 'LinkedIn', icon: '💼', color: '#0a66c2', href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(REFERRAL_URL)}` },
    { label: 'Instagram', icon: '📸', color: '#e4405f', href: '#' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.bg, color: PALETTE.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* HERO HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `linear-gradient(135deg, ${PALETTE.amberBg} 0%, ${PALETTE.pinkBg} 100%)`,
            borderRadius: 20,
            padding: 48,
            textAlign: 'center',
            marginBottom: 32,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            style={{ fontSize: 64, marginBottom: 16 }}
          >
            🎁
          </motion.div>
          <h1 style={{ fontSize: 40, fontWeight: 700, margin: '0 0 12px', letterSpacing: -1 }}>
            Parrainez un ami et gagnez <span style={{ color: PALETTE.amberDark }}>100€ de crédit</span>
          </h1>
          <p style={{ fontSize: 17, color: PALETTE.muted, margin: 0, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Chaque fois qu'un ami restaurateur s'inscrit sur Creorga via votre lien, vous gagnez du crédit et lui aussi. Plus vous parrainez, plus les récompenses grandissent.
          </p>
        </motion.div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Vos parrainages', value: stats.active.toString(), sub: 'actifs', icon: '🎯', color: PALETTE.amber },
            { label: 'Crédit gagné', value: `${stats.earned}€`, sub: 'au total', icon: '💰', color: PALETTE.green },
            { label: 'Amis inscrits', value: stats.signed.toString(), sub: `sur ${REFERRALS.length} invités`, icon: '👥', color: PALETTE.blue },
            { label: 'Classement', value: stats.rank, sub: 'des parrains', icon: '🏆', color: PALETTE.purple },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                background: PALETTE.card,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontSize: 12, color: PALETTE.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* HOW IT WORKS */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>Comment ça marche ?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { step: 1, title: 'Partagez votre code', desc: 'Envoyez votre lien unique à un ami restaurateur par email, SMS ou réseaux sociaux.', icon: '📤' },
              { step: 2, title: 'Votre ami s\'inscrit', desc: 'Il crée un compte Creorga avec votre lien et active son premier module.', icon: '✅' },
              { step: 3, title: 'Vous gagnez tous les deux', desc: '100€ de crédit pour vous, 50€ pour lui, crédités dès la fin de l\'essai gratuit.', icon: '🎉' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                style={{
                  background: PALETTE.card,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 14,
                  padding: 24,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: PALETTE.amber,
                  color: '#fff',
                  fontWeight: 700,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 40, marginBottom: 8, marginTop: 8 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: PALETTE.muted, margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* REFERRAL CODE */}
        <section style={{ marginBottom: 32 }}>
          <div style={{
            background: PALETTE.card,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            padding: 28,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Votre code de parrainage</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{
                  flex: 1,
                  minWidth: 240,
                  padding: '16px 20px',
                  background: PALETTE.amberBg,
                  border: `2px dashed ${PALETTE.amber}`,
                  borderRadius: 12,
                  fontFamily: 'ui-monospace, "Courier New", monospace',
                  fontSize: 18,
                  fontWeight: 700,
                  color: PALETTE.amberDark,
                  letterSpacing: 1,
                  textAlign: 'center',
                }}>
                  {REFERRAL_CODE}
                </div>
                <button
                  onClick={copyCode}
                  style={{
                    padding: '16px 24px',
                    background: copied ? PALETTE.green : PALETTE.text,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: 120,
                  }}
                >
                  {copied ? '✓ Copié !' : '📋 Copier'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{
                  flex: 1,
                  minWidth: 240,
                  padding: '12px 16px',
                  background: '#f9fafb',
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: PALETTE.muted,
                  fontFamily: 'ui-monospace, monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {REFERRAL_URL}
                </div>
                <button
                  onClick={copyLink}
                  style={{
                    padding: '12px 20px',
                    background: linkCopied ? PALETTE.green : PALETTE.card,
                    color: linkCopied ? '#fff' : PALETTE.text,
                    border: `1px solid ${linkCopied ? PALETTE.green : PALETTE.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {linkCopied ? '✓ Copié' : 'Copier le lien'}
                </button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  style={{
                    padding: '12px 20px',
                    background: PALETTE.card,
                    color: PALETTE.text,
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showQR ? 'Masquer QR' : '📱 QR Code'}
                </button>
              </div>

              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      padding: 20,
                      textAlign: 'center',
                      background: '#f9fafb',
                      borderRadius: 12,
                      marginTop: 8,
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: 16,
                        background: '#fff',
                        border: `1px solid ${PALETTE.border}`,
                        borderRadius: 12,
                      }}>
                        {/* Fake QR pattern */}
                        <div style={{
                          width: 160,
                          height: 160,
                          backgroundImage: `
                            linear-gradient(45deg, #000 25%, transparent 25%),
                            linear-gradient(-45deg, #000 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #000 75%),
                            linear-gradient(-45deg, transparent 75%, #000 75%)
                          `,
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                          borderRadius: 4,
                        }} />
                      </div>
                      <button style={{
                        display: 'block',
                        margin: '12px auto 0',
                        padding: '8px 16px',
                        background: PALETTE.text,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>
                        ⬇ Télécharger QR (PNG)
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* SHARE BUTTONS */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Partager en un clic</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {shareButtons.map((b) => (
                <a
                  key={b.label}
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    background: '#f9fafb',
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: PALETTE.text,
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{b.icon}</span>
                  {b.label}
                </a>
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="Inviter par email : ami@exemple.lu"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: '12px 16px',
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => { if (customEmail.includes('@')) { alert('Invitation envoyée à ' + customEmail); setCustomEmail('') } }}
                style={{
                  padding: '12px 24px',
                  background: PALETTE.amber,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Envoyer invitation
              </button>
            </div>
          </div>
        </section>

        {/* REWARDS TIERS */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Paliers de récompenses</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {TIERS.map((t, i) => {
              const unlocked = stats.active >= t.threshold
              return (
                <motion.div
                  key={t.threshold}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  style={{
                    background: unlocked ? t.bg : PALETTE.card,
                    border: `2px solid ${unlocked ? t.color : PALETTE.border}`,
                    borderRadius: 14,
                    padding: 20,
                    textAlign: 'center',
                    position: 'relative',
                    opacity: unlocked ? 1 : 0.7,
                  }}
                >
                  {unlocked && (
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      right: 10,
                      background: t.color,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      ✓ Débloqué
                    </div>
                  )}
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, color: PALETTE.muted, fontWeight: 600, marginBottom: 4 }}>{t.description}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.color }}>{t.reward}</div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* YOUR REFERRALS */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Vos amis parrainés</h2>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {REFERRALS.map((r, i) => {
              const meta = statusMeta(r.status)
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 110px 90px',
                    gap: 16,
                    padding: '16px 20px',
                    alignItems: 'center',
                    borderBottom: i < REFERRALS.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                    fontSize: 14,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: PALETTE.muted }}>{r.email}</div>
                  </div>
                  <div style={{ fontSize: 13, color: PALETTE.muted }}>{r.date}</div>
                  <span style={{
                    padding: '4px 10px',
                    background: meta.bg,
                    color: meta.color,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: r.credit > 0 ? PALETTE.green : PALETTE.muted }}>
                    {r.credit > 0 ? `+${r.credit}€` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* LEADERBOARD */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Classement du mois</h2>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {LEADERBOARD.map((l, i) => (
              <div
                key={l.rank}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 120px 100px',
                  gap: 16,
                  padding: '14px 20px',
                  alignItems: 'center',
                  borderBottom: i < LEADERBOARD.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                  fontSize: 14,
                  background: l.highlight ? PALETTE.amberBg : 'transparent',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: PALETTE.muted }}>
                  {l.badge || `#${l.rank}`}
                </span>
                <span style={{ fontWeight: l.highlight ? 700 : 500 }}>
                  {l.name} {l.highlight && <span style={{ fontSize: 12, color: PALETTE.amberDark, fontWeight: 700, marginLeft: 6 }}>(vous)</span>}
                </span>
                <span style={{ fontSize: 13, color: PALETTE.muted }}>{l.referrals} parrainages</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: PALETTE.green }}>{l.credit}€</span>
              </div>
            ))}
          </div>
        </section>

        {/* EMAIL TEMPLATES */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Templates d'invitation</h2>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{
                    padding: '8px 14px',
                    border: `1px solid ${selectedTemplate === t.id ? PALETTE.amber : PALETTE.border}`,
                    background: selectedTemplate === t.id ? PALETTE.amberBg : PALETTE.card,
                    color: selectedTemplate === t.id ? PALETTE.amberDark : PALETTE.text,
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ background: '#f9fafb', border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, color: PALETTE.muted, marginBottom: 4 }}>Objet :</div>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{tmpl.subject}</div>
              <div style={{ fontSize: 13, color: PALETTE.muted, marginBottom: 4 }}>Message :</div>
              <pre style={{
                fontFamily: 'inherit',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
                margin: 0,
                color: PALETTE.text,
                lineHeight: 1.6,
              }}>{tmpl.body}</pre>
            </div>
          </div>
        </section>

        {/* SUCCESS STORIES */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Témoignages</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {STORIES.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                style={{
                  background: PALETTE.card,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: PALETTE.amberBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {s.photo}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: PALETTE.green, fontWeight: 700 }}>{s.amount}€ gagnés</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: PALETTE.text, margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                  « {s.quote} »
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <footer style={{ textAlign: 'center', color: PALETTE.muted, fontSize: 13, paddingTop: 24, borderTop: `1px solid ${PALETTE.border}` }}>
          Programme de parrainage Creorga · Crédit valable 12 mois · Conditions générales applicables
        </footer>
      </div>
    </div>
  )
}
