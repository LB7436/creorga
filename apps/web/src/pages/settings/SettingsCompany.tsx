import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Receipt,
  Printer,
  Bell,
  ShieldCheck,
  Upload,
  KeyRound,
  Smartphone,
  Monitor,
  Trash2,
  Check,
  QrCode,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'
import { useAuthStore } from '@/stores/authStore'

type TabKey = 'general' | 'fiscal' | 'print' | 'notifications' | 'security'

const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: 'general', label: 'Général', icon: Building2 },
  { key: 'fiscal', label: 'Fiscalité', icon: Receipt },
  { key: 'print', label: 'Impression', icon: Printer },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Sécurité', icon: ShieldCheck },
]

// ---- Shared tokens ----
const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#fff',
  bgSoft: '#f8fafc',
  indigo: '#6366f1',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
}

const card: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 28,
  boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 7,
}

const input: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.15s',
  boxSizing: 'border-box',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: C.text,
  marginBottom: 4,
  letterSpacing: '-0.01em',
}

const sectionDesc: React.CSSProperties = {
  fontSize: 13.5,
  color: C.muted,
  marginBottom: 24,
}

const primaryBtn: React.CSSProperties = {
  height: 40,
  padding: '0 18px',
  borderRadius: 10,
  border: 'none',
  background: C.indigo,
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.15s',
}

const ghostBtn: React.CSSProperties = {
  height: 40,
  padding: '0 16px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.15s',
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: checked ? C.indigo : '#cbd5e1',
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
      aria-pressed={checked}
    >
      <motion.span
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function Row({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: `1px solid ${C.border}`,
        gap: 20,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</div>
        {desc && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{desc}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

// ---- Tab: GÉNÉRAL ----
function GeneralTab({ companyName }: { companyName: string }) {
  const [form, setForm] = useState({
    name: companyName || 'Café um Rond-Point',
    legal: 'Café um Rond-Point S.à r.l.',
    address: '12 Grand-Rue',
    city: 'Rumelange',
    zip: 'L-3730',
    country: 'Luxembourg',
    phone: '+352 56 12 34',
    email: 'contact@cafe-rondpoint.lu',
    lang: 'fr',
    tz: 'Europe/Luxembourg',
    currency: 'EUR',
    dateFmt: 'dd/MM/yyyy',
  })

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card}>
        <div style={sectionTitle}>Identité de l\'entreprise</div>
        <div style={sectionDesc}>Logo, nom commercial et coordonnées publiques.</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 8px 20px rgba(99,102,241,0.25)',
            }}
          >
            C
          </div>
          <div style={{ flex: 1 }}>
            <button style={{ ...ghostBtn, marginBottom: 8 }}>
              <Upload size={15} /> Téléverser un logo
            </button>
            <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>
              PNG ou SVG, 512×512px recommandé, 2 Mo max.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginTop: 24,
          }}
        >
          <div>
            <label style={label}>Nom commercial</label>
            <input style={input} value={form.name} onChange={onChange('name')} />
          </div>
          <div>
            <label style={label}>Raison sociale</label>
            <input style={input} value={form.legal} onChange={onChange('legal')} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Adresse</label>
            <input
              style={input}
              value={form.address}
              onChange={onChange('address')}
            />
          </div>
          <div>
            <label style={label}>Code postal</label>
            <input style={input} value={form.zip} onChange={onChange('zip')} />
          </div>
          <div>
            <label style={label}>Ville</label>
            <input style={input} value={form.city} onChange={onChange('city')} />
          </div>
          <div>
            <label style={label}>Téléphone</label>
            <input style={input} value={form.phone} onChange={onChange('phone')} />
          </div>
          <div>
            <label style={label}>Email</label>
            <input
              style={input}
              type="email"
              value={form.email}
              onChange={onChange('email')}
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Préférences régionales</div>
        <div style={sectionDesc}>Langue, fuseau horaire, devise et formats.</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <label style={label}>Langue par défaut</label>
            <select style={input} value={form.lang} onChange={onChange('lang')}>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div>
            <label style={label}>Fuseau horaire</label>
            <select style={input} value={form.tz} onChange={onChange('tz')}>
              <option value="Europe/Luxembourg">Europe/Luxembourg (UTC+1)</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
            </select>
          </div>
          <div>
            <label style={label}>Devise</label>
            <select
              style={input}
              value={form.currency}
              onChange={onChange('currency')}
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar US ($)</option>
              <option value="CHF">Franc suisse (CHF)</option>
            </select>
          </div>
          <div>
            <label style={label}>Format de date</label>
            <select style={input} value={form.dateFmt} onChange={onChange('dateFmt')}>
              <option value="dd/MM/yyyy">31/12/2026</option>
              <option value="yyyy-MM-dd">2026-12-31</option>
              <option value="dd MMM yyyy">31 déc. 2026</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Tab: FISCALITÉ ----
function FiscalTab() {
  const [form, setForm] = useState({
    vat: 'LU12345678',
    regime: 'normal',
    vatFood: 3,
    vatDrinks: 17,
    vatDefault: 17,
    legal:
      'TVA comprise — N° TVA LU12345678 — RCSL B123456 — Mentions obligatoires conformes à la loi luxembourgeoise.',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card}>
        <div style={sectionTitle}>Informations fiscales</div>
        <div style={sectionDesc}>
          Numéro de TVA et régime fiscal applicable à votre établissement.
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
        >
          <div>
            <label style={label}>Numéro de TVA</label>
            <input
              style={input}
              value={form.vat}
              onChange={(e) => setForm({ ...form, vat: e.target.value })}
              placeholder="LU12345678"
            />
          </div>
          <div>
            <label style={label}>Régime fiscal</label>
            <select
              style={input}
              value={form.regime}
              onChange={(e) => setForm({ ...form, regime: e.target.value })}
            >
              <option value="normal">Régime normal</option>
              <option value="franchise">Franchise en base</option>
              <option value="simplified">Simplifié</option>
            </select>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Taux de TVA par catégorie</div>
        <div style={sectionDesc}>
          Taux appliqués automatiquement lors de la vente. Luxembourg : 3% alimentation
          / 17% boissons.
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}
        >
          <div>
            <label style={label}>Alimentation (food)</label>
            <div style={{ position: 'relative' }}>
              <input
                style={input}
                type="number"
                value={form.vatFood}
                onChange={(e) =>
                  setForm({ ...form, vatFood: Number(e.target.value) })
                }
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: C.muted,
                  fontSize: 14,
                }}
              >
                %
              </span>
            </div>
          </div>
          <div>
            <label style={label}>Boissons (drinks)</label>
            <div style={{ position: 'relative' }}>
              <input
                style={input}
                type="number"
                value={form.vatDrinks}
                onChange={(e) =>
                  setForm({ ...form, vatDrinks: Number(e.target.value) })
                }
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: C.muted,
                  fontSize: 14,
                }}
              >
                %
              </span>
            </div>
          </div>
          <div>
            <label style={label}>Taux par défaut</label>
            <div style={{ position: 'relative' }}>
              <input
                style={input}
                type="number"
                value={form.vatDefault}
                onChange={(e) =>
                  setForm({ ...form, vatDefault: Number(e.target.value) })
                }
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: C.muted,
                  fontSize: 14,
                }}
              >
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Mentions légales sur factures</div>
        <div style={sectionDesc}>
          Texte affiché en pied de page sur toutes les factures et reçus.
        </div>
        <textarea
          style={{
            ...input,
            height: 110,
            padding: 12,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
          value={form.legal}
          onChange={(e) => setForm({ ...form, legal: e.target.value })}
        />
      </div>
    </div>
  )
}

// ---- Tab: IMPRESSION ----
function PrintTab() {
  const [form, setForm] = useState({
    ticketIp: '192.168.1.42',
    kitchenIp: '192.168.1.43',
    format: '80mm',
    header: 'Café um Rond-Point\n12 Grand-Rue, L-3730 Rumelange',
    footer: 'Merci de votre visite · www.cafe-rondpoint.lu',
    qrEnabled: true,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card}>
        <div style={sectionTitle}>Imprimantes réseau</div>
        <div style={sectionDesc}>
          Adresses IP des imprimantes thermiques connectées au réseau local.
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
        >
          <div>
            <label style={label}>Imprimante tickets (caisse)</label>
            <input
              style={input}
              value={form.ticketIp}
              onChange={(e) => setForm({ ...form, ticketIp: e.target.value })}
              placeholder="192.168.1.42"
            />
          </div>
          <div>
            <label style={label}>Imprimante cuisine</label>
            <input
              style={input}
              value={form.kitchenIp}
              onChange={(e) => setForm({ ...form, kitchenIp: e.target.value })}
              placeholder="192.168.1.43"
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={label}>Format tickets</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['80mm', '58mm'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setForm({ ...form, format: f })}
                style={{
                  height: 44,
                  padding: '0 22px',
                  borderRadius: 10,
                  border: `1px solid ${form.format === f ? C.indigo : C.border}`,
                  background: form.format === f ? 'rgba(99,102,241,0.08)' : C.bg,
                  color: form.format === f ? C.indigo : C.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                {form.format === f && <Check size={15} />}
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Mise en page des tickets</div>
        <div style={sectionDesc}>
          Personnalisez l\'en-tête, le pied de page et l\'affichage des tickets.
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
        >
          <div>
            <label style={label}>En-tête personnalisé</label>
            <textarea
              style={{
                ...input,
                height: 90,
                padding: 12,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              value={form.header}
              onChange={(e) => setForm({ ...form, header: e.target.value })}
            />
          </div>
          <div>
            <label style={label}>Pied de page personnalisé</label>
            <textarea
              style={{
                ...input,
                height: 90,
                padding: 12,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              value={form.footer}
              onChange={(e) => setForm({ ...form, footer: e.target.value })}
            />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <Row
            title="QR Code sur les tickets"
            desc="Inclure un QR code pointant vers le lien de paiement ou d\'évaluation."
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QrCode size={18} style={{ color: C.muted }} />
              <Toggle
                checked={form.qrEnabled}
                onChange={(v) => setForm({ ...form, qrEnabled: v })}
              />
            </div>
          </Row>
        </div>
      </div>
    </div>
  )
}

// ---- Tab: NOTIFICATIONS ----
function NotificationsTab() {
  const [form, setForm] = useState({
    emailOrders: true,
    smsUrgent: true,
    push: false,
    stockThreshold: 20,
    abandonedMin: 15,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card}>
        <div style={sectionTitle}>Canaux de notification</div>
        <div style={sectionDesc}>
          Choisissez comment vous souhaitez être alerté des événements importants.
        </div>
        <Row
          title="Email — réception des commandes"
          desc="Envoyer un email à chaque nouvelle commande en ligne."
        >
          <Toggle
            checked={form.emailOrders}
            onChange={(v) => setForm({ ...form, emailOrders: v })}
          />
        </Row>
        <Row
          title="SMS — alertes urgentes"
          desc="Panne imprimante, incident caisse, annulations importantes."
        >
          <Toggle
            checked={form.smsUrgent}
            onChange={(v) => setForm({ ...form, smsUrgent: v })}
          />
        </Row>
        <Row
          title="Notifications push"
          desc="Alertes en temps réel sur l\'application mobile."
        >
          <Toggle
            checked={form.push}
            onChange={(v) => setForm({ ...form, push: v })}
          />
        </Row>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Seuils d\'alerte</div>
        <div style={sectionDesc}>
          Définissez les seuils déclenchant des notifications automatiques.
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
        >
          <div>
            <label style={label}>Stock bas (% du stock initial)</label>
            <div style={{ position: 'relative' }}>
              <input
                style={input}
                type="number"
                value={form.stockThreshold}
                onChange={(e) =>
                  setForm({ ...form, stockThreshold: Number(e.target.value) })
                }
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: C.muted,
                  fontSize: 14,
                }}
              >
                %
              </span>
            </div>
          </div>
          <div>
            <label style={label}>Panier abandonné (minutes)</label>
            <div style={{ position: 'relative' }}>
              <input
                style={input}
                type="number"
                value={form.abandonedMin}
                onChange={(e) =>
                  setForm({ ...form, abandonedMin: Number(e.target.value) })
                }
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: C.muted,
                  fontSize: 14,
                }}
              >
                min
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Tab: SÉCURITÉ ----
function SecurityTab() {
  const [twoFa, setTwoFa] = useState(false)
  const sessions = [
    {
      id: '1',
      device: 'MacBook Pro · Chrome',
      location: 'Rumelange, LU',
      ip: '85.92.14.22',
      current: true,
      icon: Monitor,
      time: 'Maintenant',
    },
    {
      id: '2',
      device: 'iPhone 15 · Safari',
      location: 'Luxembourg, LU',
      ip: '85.92.14.45',
      current: false,
      icon: Smartphone,
      time: 'Il y a 2 h',
    },
    {
      id: '3',
      device: 'iPad Pro · Safari',
      location: 'Esch-sur-Alzette, LU',
      ip: '213.66.101.8',
      current: false,
      icon: Monitor,
      time: 'Hier à 18:42',
    },
  ]

  const history = [
    { when: '16/04/2026 09:12', from: 'Rumelange, LU', status: 'Succès' },
    { when: '15/04/2026 18:42', from: 'Esch-sur-Alzette, LU', status: 'Succès' },
    { when: '14/04/2026 22:03', from: 'Inconnue (VPN)', status: 'Bloquée' },
    { when: '14/04/2026 08:55', from: 'Rumelange, LU', status: 'Succès' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card}>
        <div style={sectionTitle}>Mot de passe</div>
        <div style={sectionDesc}>
          Modifiez votre mot de passe. Minimum 12 caractères avec lettres, chiffres et
          symboles.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <div>
            <label style={label}>Mot de passe actuel</label>
            <input style={input} type="password" placeholder="••••••••" />
          </div>
          <div>
            <label style={label}>Nouveau mot de passe</label>
            <input style={input} type="password" placeholder="••••••••" />
          </div>
          <div>
            <label style={label}>Confirmer</label>
            <input style={input} type="password" placeholder="••••••••" />
          </div>
        </div>
        <button style={{ ...primaryBtn, marginTop: 16 }}>
          <KeyRound size={15} /> Modifier le mot de passe
        </button>
      </div>

      <div style={card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
          }}
        >
          <div>
            <div style={sectionTitle}>Authentification à deux facteurs</div>
            <div style={sectionDesc}>
              Ajoutez une couche de sécurité supplémentaire via application
              authenticator (Google, Authy, 1Password).
            </div>
          </div>
          <Toggle checked={twoFa} onChange={setTwoFa} />
        </div>
        {twoFa && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              marginTop: 8,
              padding: 16,
              borderRadius: 12,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#065f46',
              fontSize: 13.5,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              2FA activée. Utilisez votre application d\'authentification pour
              générer les codes à 6 chiffres lors de la connexion.
            </span>
          </motion.div>
        )}
      </div>

      <div style={card}>
        <div style={sectionTitle}>Sessions actives</div>
        <div style={sectionDesc}>
          Appareils actuellement connectés à votre compte. Révoquez ceux que vous ne
          reconnaissez pas.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 0',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: C.bgSoft,
                  color: C.muted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <s.icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {s.device}
                  {s.current && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.green,
                        background: 'rgba(16,185,129,0.12)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        letterSpacing: '0.04em',
                      }}
                    >
                      ACTIF
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                  {s.location} · {s.ip} · {s.time}
                </div>
              </div>
              {!s.current && (
                <button
                  style={{
                    ...ghostBtn,
                    height: 34,
                    padding: '0 12px',
                    fontSize: 13,
                    color: C.red,
                    borderColor: 'rgba(239,68,68,0.3)',
                  }}
                  onClick={() => toast.success('Session révoquée')}
                >
                  <Trash2 size={14} /> Révoquer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Historique des connexions</div>
        <div style={sectionDesc}>Les 30 derniers événements de connexion.</div>
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: `1px solid ${C.border}`,
                fontSize: 13.5,
              }}
            >
              <span style={{ color: C.text, fontFamily: 'ui-monospace, monospace' }}>
                {h.when}
              </span>
              <span style={{ color: C.muted, flex: 1, padding: '0 16px' }}>
                {h.from}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 6,
                  color: h.status === 'Succès' ? C.green : C.red,
                  background:
                    h.status === 'Succès'
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(239,68,68,0.12)',
                }}
              >
                {h.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SettingsCompany() {
  const company = useAuthStore((s) => s.company)
  const [active, setActive] = useState<TabKey>('general')

  const handleSave = () => {
    toast.success('Paramètres enregistrés')
  }

  return (
    <SettingsLayout>
      <div style={{ maxWidth: 960 }}>
        {/* Sub-tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            background: C.bgSoft,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            marginBottom: 24,
            width: 'fit-content',
          }}
        >
          {tabs.map((t) => {
            const isActive = active === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? C.text : C.muted,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'color 0.15s',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-tab-pill"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: C.bg,
                      borderRadius: 8,
                      boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
                      zIndex: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <t.icon size={15} />
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {active === 'general' && (
              <GeneralTab companyName={company?.name ?? ''} />
            )}
            {active === 'fiscal' && <FiscalTab />}
            {active === 'print' && <PrintTab />}
            {active === 'notifications' && <NotificationsTab />}
            {active === 'security' && <SecurityTab />}
          </motion.div>
        </AnimatePresence>

        {/* Save bar */}
        <div
          style={{
            marginTop: 28,
            padding: '16px 0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button style={ghostBtn}>Annuler</button>
          <button style={primaryBtn} onClick={handleSave}>
            <Check size={16} /> Enregistrer les modifications
          </button>
        </div>
      </div>
    </SettingsLayout>
  )
}
