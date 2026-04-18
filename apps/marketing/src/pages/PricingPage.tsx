import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronDown, Sparkles } from 'lucide-react';
import CTAButton from '../components/CTAButton';

const plans = [
  {
    name: 'Starter',
    price: 39,
    desc: '1 site · 3 utilisateurs',
    features: ['POS Caisse', 'Réservations', 'Stocks basiques', 'TVA LU', 'Support email'],
    cta: 'Commencer',
  },
  {
    name: 'Pro',
    price: 79,
    popular: true,
    desc: '1 site · 10 utilisateurs',
    features: [
      'Tout Starter +',
      'CRM clients',
      'HACCP complet',
      'Marketing email',
      'App mobile',
      'Support prioritaire',
    ],
    cta: 'Choisir Pro',
  },
  {
    name: 'Business',
    price: 149,
    desc: '3 sites · utilisateurs illimités',
    features: [
      'Tout Pro +',
      'Multi-sites consolidé',
      'Forecasting IA',
      'API & webhooks',
      'SSO',
      'Support 24/7',
    ],
    cta: 'Choisir Business',
  },
  {
    name: 'Enterprise',
    price: null,
    desc: 'Sur devis · Illimité',
    features: [
      'Tout Business +',
      'Sites illimités',
      'SLA personnalisé',
      'Onboarding dédié',
      'Déploiement on-premise',
      'Account manager',
    ],
    cta: 'Nous contacter',
  },
];

const matrix = [
  { group: 'Core', rows: [
    ['POS Caisse', true, true, true, true],
    ['Réservations', true, true, true, true],
    ['QR Menu', true, true, true, true],
    ['Kitchen Display', false, true, true, true],
  ]},
  { group: 'Business', rows: [
    ['CRM clients', false, true, true, true],
    ['Fidélité', false, true, true, true],
    ['Marketing email', false, true, true, true],
    ['HACCP', false, true, true, true],
  ]},
  { group: 'Admin', rows: [
    ['Multi-sites', false, false, true, true],
    ['API & webhooks', false, false, true, true],
    ['SSO', false, false, true, true],
    ['Audit log', false, false, true, true],
  ]},
  { group: 'IA & Digital', rows: [
    ['Assistant IA basique', false, true, true, true],
    ['Forecasting IA', false, false, true, true],
    ['App mobile', false, true, true, true],
    ['Intégrations custom', false, false, false, true],
  ]},
];

const faqs = [
  { q: "Ai-je besoin d'une carte bancaire pour l'essai ?", a: "Non. L'essai de 14 jours est 100% gratuit, sans CB et sans engagement." },
  { q: "Puis-je changer de plan à tout moment ?", a: "Oui, vous pouvez upgrader ou downgrader depuis votre tableau de bord. Les changements sont au prorata." },
  { q: "Creorga est-il conforme à la TVA Luxembourg ?", a: "Totalement. Les taux 3%, 8%, 14% et 17% sont pré-configurés. Export FAIA compatible e-CDF." },
  { q: "Puis-je importer mes données actuelles ?", a: "Oui. Notre équipe migre gratuitement vos produits, clients et historiques depuis votre solution actuelle." },
  { q: "Que se passe-t-il si j'annule ?", a: "Aucun frais d'annulation. Vous exportez toutes vos données (CSV, JSON, PDF) à tout moment." },
  { q: "Le matériel est-il inclus ?", a: "Non, mais Creorga fonctionne sur tout iPad, Android ou Windows. Nous recommandons des packs à partir de 390€." },
  { q: "Y a-t-il des frais cachés ?", a: "Jamais. Le prix affiché est le prix final. Support, mises à jour et hébergement sont inclus." },
  { q: "Où sont stockées mes données ?", a: "Dans des datacenters européens (Luxembourg + Francfort). Conformité RGPD et CNPD garantie." },
];

export default function PricingPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          padding: '80px 24px 60px',
          textAlign: 'center',
          background:
            'radial-gradient(ellipse at top, #eef2ff 0%, transparent 60%), #fff',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 99,
              background: '#eef2ff',
              color: '#6366f1',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 20,
            }}
          >
            <Sparkles size={12} /> TARIFS
          </div>
          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              letterSpacing: -2,
              marginBottom: 16,
            }}
          >
            Des tarifs clairs,
            <br />
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sans surprise
            </span>
          </h1>
          <p style={{ fontSize: 19, color: '#64748b', marginBottom: 12 }}>
            14 jours gratuits · Sans engagement · Sans CB
          </p>
        </div>
      </section>

      {/* Plans */}
      <section style={{ padding: '20px 24px 80px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  position: 'relative',
                  padding: 32,
                  borderRadius: 18,
                  background: p.popular ? 'linear-gradient(180deg, #6366f1, #a855f7)' : '#fff',
                  color: p.popular ? '#fff' : '#0f172a',
                  border: p.popular ? 'none' : '1px solid #e2e8f0',
                  boxShadow: p.popular
                    ? '0 30px 60px -20px rgba(99,102,241,0.5)'
                    : '0 2px 4px rgba(0,0,0,0.02)',
                  transform: p.popular ? 'scale(1.02)' : 'none',
                }}
              >
                {p.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 14px',
                      borderRadius: 99,
                      background: '#fbbf24',
                      color: '#78350f',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                    }}
                  >
                    POPULAIRE
                  </div>
                )}

                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 20 }}>{p.desc}</div>

                <div style={{ marginBottom: 24 }}>
                  {p.price != null ? (
                    <>
                      <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2 }}>{p.price}€</span>
                      <span style={{ fontSize: 14, opacity: 0.7, marginLeft: 4 }}>/mois HT</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 30, fontWeight: 900 }}>Sur devis</span>
                  )}
                </div>

                <ul style={{ listStyle: 'none', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                      <Check size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <CTAButton
                  to={p.price == null ? '/contact' : '/demo'}
                  variant={p.popular ? 'secondary' : 'primary'}
                  icon={false}
                >
                  {p.cta}
                </CTAButton>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ padding: '60px 24px', background: '#fafbff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, textAlign: 'center', marginBottom: 40 }}>
            Comparez en détail
          </h2>

          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr repeat(4, 1fr)',
                padding: 16,
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <div>Fonctionnalité</div>
              <div style={{ textAlign: 'center' }}>Starter</div>
              <div style={{ textAlign: 'center', color: '#6366f1' }}>Pro</div>
              <div style={{ textAlign: 'center' }}>Business</div>
              <div style={{ textAlign: 'center' }}>Enterprise</div>
            </div>
            {matrix.map((section) => (
              <div key={section.group}>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f1f5f9',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#475569',
                    letterSpacing: 1,
                  }}
                >
                  {section.group.toUpperCase()}
                </div>
                {section.rows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr repeat(4, 1fr)',
                      padding: '14px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: 14,
                      alignItems: 'center',
                    }}
                  >
                    <div>{row[0]}</div>
                    {row.slice(1).map((v, j) => (
                      <div key={j} style={{ textAlign: 'center' }}>
                        {v ? (
                          <Check size={18} color="#10b981" style={{ display: 'inline' }} />
                        ) : (
                          <X size={18} color="#cbd5e1" style={{ display: 'inline' }} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, textAlign: 'center', marginBottom: 40 }}>
            Questions fréquentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqs.map((f, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 15,
                    fontWeight: 600,
                    textAlign: 'left',
                    color: '#0f172a',
                  }}
                >
                  {f.q}
                  <ChevronDown
                    size={18}
                    style={{
                      transform: open === i ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                {open === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      padding: '0 20px 18px',
                      fontSize: 14,
                      color: '#64748b',
                      lineHeight: 1.6,
                    }}
                  >
                    {f.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final */}
      <section
        style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: '#fff',
        }}
      >
        <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, marginBottom: 16 }}>
          14 jours gratuits. Sans CB.
        </h2>
        <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 32 }}>
          Testez toutes les fonctionnalités du plan Business pendant 2 semaines.
        </p>
        <CTAButton to="/demo" variant="secondary" size="lg">
          Démarrer mon essai
        </CTAButton>
      </section>
    </div>
  );
}
