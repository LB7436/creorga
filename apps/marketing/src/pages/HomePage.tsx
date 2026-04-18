import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Building2,
  ShieldCheck,
  Languages,
  Bot,
  HeadphonesIcon,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import HeroSection from '../components/HeroSection';
import CTAButton from '../components/CTAButton';

const features = [
  {
    icon: Zap,
    title: 'POS moderne & rapide',
    desc: 'Commandes en 2 tocs. Interface tactile pensée pour le rush du service.',
    color: '#6366f1',
  },
  {
    icon: Building2,
    title: 'Multi-établissements',
    desc: 'Pilotez 1 ou 100 restaurants depuis la même console. Consolidation temps réel.',
    color: '#a855f7',
  },
  {
    icon: ShieldCheck,
    title: 'Conformité Luxembourg',
    desc: 'TVA 3/8/17 %, HACCP, CNPD, archivage 10 ans. Tout est prêt.',
    color: '#ec4899',
  },
  {
    icon: Languages,
    title: 'Multilingue FR/DE/LU/EN/PT',
    desc: 'Votre équipe parle 5 langues ? Creorga aussi.',
    color: '#f59e0b',
  },
  {
    icon: Bot,
    title: 'Assistant IA intégré',
    desc: "Prédit vos ventes, optimise vos stocks, répond à vos clients.",
    color: '#10b981',
  },
  {
    icon: HeadphonesIcon,
    title: 'Support 24/7',
    desc: 'Une équipe à Luxembourg, en français. Réponse en moins de 15 min.',
    color: '#06b6d4',
  },
];

const modules = [
  'POS Caisse', 'Réservations', 'Commandes en ligne', 'QR Menu', 'Kitchen Display',
  'Gestion stocks', 'Fournisseurs', 'Recettes & coûts', 'HACCP',
  'RH & plannings', 'Pointeuse', 'Paie',
  'CRM clients', 'Fidélité', 'Marketing email', 'Cadeaux & bons',
  'Comptabilité', 'TVA Luxembourg', 'Facturation', 'Dépenses',
  'Analytics', 'Reports', 'Forecasting IA',
  'Multi-sites', 'Franchise', 'API & webhooks', 'App mobile',
];

const testimonials = [
  {
    name: 'Marie Schmitt',
    role: 'Gérante, Café de la Gare',
    city: 'Luxembourg-Ville',
    quote: "On a gagné 2h par service rien que sur la caisse. Le support est incroyable, ils répondent en luxembourgeois !",
    rating: 5,
  },
  {
    name: 'João Ferreira',
    role: 'Chef-propriétaire, Bistrot Português',
    city: 'Esch-sur-Alzette',
    quote: "La gestion multilingue change la vie. Mon équipe mixte PT/FR/LU est enfin autonome sur la caisse.",
    rating: 5,
  },
  {
    name: 'Thomas Weber',
    role: 'CFO, Groupe HoReCa Lux',
    city: 'Differdange',
    quote: "3 établissements, 1 seule console. La consolidation comptable me fait économiser 40h/mois.",
    rating: 5,
  },
  {
    name: 'Sophie Muller',
    role: 'Propriétaire, Brasserie du Rond-Point',
    city: 'Rumelange',
    quote: "Creorga nous a accompagnés pour la mise en conformité CNPD. Un vrai partenaire local.",
    rating: 5,
  },
  {
    name: 'Alessandro Rossi',
    role: 'Manager, Pizzeria Bella Italia',
    city: 'Dudelange',
    quote: "L'IA prévoit nos ventes avec une précision folle. On a réduit le gaspillage de 35%.",
    rating: 5,
  },
];

const logos = [
  'Café Rumelange', 'Bistrot Esch', 'La Terrasse', 'Brasserie Lux',
  'Pizza Napoli', 'Le Gourmand', 'Chez Marie', 'Hôtel Central',
];

export default function HomePage() {
  const [tIndex, setTIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTIndex((i) => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <HeroSection />

      {/* Trusted by */}
      <section style={{ padding: '48px 24px', borderTop: '1px solid #f1f5f9', background: '#fafbff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#64748b',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            Ils nous font confiance
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 20,
              alignItems: 'center',
            }}
          >
            {logos.map((l) => (
              <div
                key={l}
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#94a3b8',
                  fontFamily: 'serif',
                  letterSpacing: 0.5,
                  opacity: 0.8,
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Creorga */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 99,
                background: '#eef2ff',
                color: '#6366f1',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              POURQUOI CREORGA
            </motion.div>
            <h2
              style={{
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 900,
                letterSpacing: -1.5,
                marginBottom: 16,
              }}
            >
              Tout ce dont vous avez besoin,
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                rien de superflu
              </span>
            </h2>
            <p style={{ fontSize: 18, color: '#64748b', maxWidth: 600, margin: '0 auto' }}>
              Pensé par des restaurateurs, construit avec les dernières technologies.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -6 }}
                  style={{
                    padding: 28,
                    borderRadius: 16,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s',
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${f.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                    }}
                  >
                    <Icon size={24} color={f.color} />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 27 modules grid */}
      <section
        style={{
          padding: '100px 24px',
          background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 900, letterSpacing: -1.5, marginBottom: 16 }}>
              Tous vos outils en 1
            </h2>
            <p style={{ fontSize: 18, color: '#64748b' }}>
              27 modules intégrés. Zéro intégration externe. Zéro galère.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {modules.map((m, i) => (
              <motion.div
                key={m}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ scale: 1.05, borderColor: '#6366f1' }}
                style={{
                  padding: '16px 12px',
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'default',
                }}
              >
                {m}
              </motion.div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <CTAButton to="/fonctionnalites" variant="ghost">
              Découvrir tous les modules
            </CTAButton>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          padding: '80px 24px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          color: '#fff',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 40,
            textAlign: 'center',
          }}
        >
          {[
            { v: '500+', l: 'établissements' },
            { v: '1,2M', l: 'commandes / jour' },
            { v: '40%', l: 'temps économisé' },
            { v: '99,99%', l: 'uptime' },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2, marginBottom: 4 }}>
                {s.v}
              </div>
              <div style={{ fontSize: 15, opacity: 0.9, letterSpacing: 0.5 }}>{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 900, letterSpacing: -1.5, marginBottom: 48 }}>
            Des restaurateurs conquis
          </h2>

          <motion.div
            key={tIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 48,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #fafbff, #faf5ff)',
              border: '1px solid #e2e8f0',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 20 }}>
              {Array.from({ length: testimonials[tIndex].rating }).map((_, i) => (
                <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>
            <p
              style={{
                fontSize: 22,
                lineHeight: 1.5,
                color: '#0f172a',
                fontWeight: 500,
                marginBottom: 28,
                fontStyle: 'italic',
              }}
            >
              « {testimonials[tIndex].quote} »
            </p>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{testimonials[tIndex].name}</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {testimonials[tIndex].role} — {testimonials[tIndex].city}
            </div>
          </motion.div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setTIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTIndex(i)}
                  style={{
                    width: i === tIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === tIndex ? '#6366f1' : '#cbd5e1',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setTIndex((i) => (i + 1) % testimonials.length)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Pricing summary */}
      <section style={{ padding: '80px 24px', background: '#fafbff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 900, letterSpacing: -1.5, marginBottom: 16 }}>
            Une tarification simple
          </h2>
          <p style={{ fontSize: 18, color: '#64748b', marginBottom: 48 }}>
            À partir de 39€/mois. Sans engagement, sans frais cachés.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 40,
            }}
          >
            {[
              { name: 'Starter', price: '39€' },
              { name: 'Pro', price: '79€', hl: true },
              { name: 'Business', price: '149€' },
              { name: 'Enterprise', price: 'Sur devis' },
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  padding: 28,
                  borderRadius: 14,
                  background: p.hl ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#fff',
                  color: p.hl ? '#fff' : '#0f172a',
                  border: p.hl ? 'none' : '1px solid #e2e8f0',
                  boxShadow: p.hl ? '0 20px 40px -10px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{p.price}</div>
                {p.price !== 'Sur devis' && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>/ mois / site</div>
                )}
              </div>
            ))}
          </div>
          <CTAButton to="/tarifs" size="lg">Voir tous les tarifs</CTAButton>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          padding: '120px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, rgba(99,102,241,0.1), transparent 60%), radial-gradient(ellipse at center, rgba(236,72,153,0.08), transparent 60%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              letterSpacing: -2,
              marginBottom: 20,
            }}
          >
            Démarrez aujourd'hui.
          </h2>
          <p style={{ fontSize: 20, color: '#64748b', marginBottom: 36 }}>
            14 jours gratuits. Installation en 1 jour. Support inclus.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CTAButton to="/demo" size="lg">Essai gratuit 14 jours</CTAButton>
            <CTAButton to="/contact" variant="secondary" size="lg">Parler à un expert</CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
