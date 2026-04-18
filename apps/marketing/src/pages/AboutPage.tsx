import { motion } from 'framer-motion';
import { Lightbulb, Heart, ShieldCheck, MapPin } from 'lucide-react';
import CTAButton from '../components/CTAButton';

const team = [
  { name: 'Bryan Lemaire', role: 'CEO & Fondateur', city: 'Rumelange' },
  { name: 'Sarah Muller', role: 'CTO', city: 'Luxembourg-Ville' },
  { name: 'Paul Weber', role: 'Head of Product', city: 'Esch-sur-Alzette' },
  { name: 'Léa Dupont', role: 'Head of Customer Success', city: 'Differdange' },
  { name: 'Marco Rossi', role: 'Lead Designer', city: 'Luxembourg-Ville' },
  { name: 'Ana Silva', role: 'Head of Marketing', city: 'Dudelange' },
];

const values = [
  {
    icon: Lightbulb,
    title: 'Innovation',
    desc: "On refuse le status quo. L'IA, le temps réel, l'automatisation — c'est notre quotidien.",
  },
  {
    icon: Heart,
    title: 'Proximité',
    desc: "Support en français, allemand, luxembourgeois. Équipe à 15 min de chez vous.",
  },
  {
    icon: ShieldCheck,
    title: 'Conformité',
    desc: "TVA, HACCP, CNPD, archivage — on maîtrise la réglementation LU à la virgule près.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section
        style={{
          padding: '100px 24px 80px',
          textAlign: 'center',
          background:
            'radial-gradient(ellipse at top, #eef2ff 0%, transparent 60%), radial-gradient(ellipse at bottom, #fdf4ff 0%, transparent 60%), #fff',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 99,
              background: '#fff',
              border: '1px solid #e2e8f0',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 16 }}>🇱🇺</span> Né au Luxembourg
          </motion.div>
          <h1
            style={{
              fontSize: 'clamp(40px, 6vw, 68px)',
              fontWeight: 900,
              letterSpacing: -2.5,
              marginBottom: 24,
            }}
          >
            Creorga,
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              construit pour nous
            </span>
          </h1>
          <p style={{ fontSize: 20, color: '#64748b', lineHeight: 1.5 }}>
            Parce qu'aucun logiciel étranger ne comprenait vraiment nos taux TVA,
            nos 5 langues et notre HACCP, on l'a fait nous-mêmes.
          </p>
        </div>
      </section>

      {/* Story */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div
            style={{
              padding: 48,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #fafbff, #faf5ff)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 99,
                background: '#eef2ff',
                color: '#6366f1',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 20,
                letterSpacing: 1,
              }}
            >
              CASE STUDY
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 20 }}>
              Le café um Rond-Point, Rumelange
            </h2>
            <p style={{ fontSize: 17, color: '#334155', lineHeight: 1.7, marginBottom: 16 }}>
              Tout a commencé dans un café familial du Rond-Point, à Rumelange. Le gérant jonglait
              avec 5 outils différents : une caisse allemande, un logiciel de réservations français,
              un Excel pour les stocks, des post-its pour le planning, et une comptable qui criait
              tous les mois sur l'absence d'export FAIA.
            </p>
            <p style={{ fontSize: 17, color: '#334155', lineHeight: 1.7, marginBottom: 16 }}>
              En 2024, on a décidé de construire <strong>une seule plateforme</strong> qui ferait
              tout — et qui parlerait luxembourgeois. Six mois plus tard, le café du Rond-Point
              avait divisé son temps administratif par trois et augmenté son CA de 18%.
            </p>
            <p style={{ fontSize: 17, color: '#334155', lineHeight: 1.7 }}>
              Aujourd'hui, Creorga équipe <strong>500+ établissements</strong> dans le Grand-Duché
              et la Grande Région. Et on n'a pas fini.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '80px 24px', background: '#fafbff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: -1.5,
              textAlign: 'center',
              marginBottom: 48,
            }}
          >
            Nos valeurs
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24,
            }}
          >
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    padding: 32,
                    borderRadius: 16,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      color: '#fff',
                    }}
                  >
                    <Icon size={28} />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{v.title}</h3>
                  <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>{v.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: -1.5,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            L'équipe
          </h2>
          <p style={{ textAlign: 'center', fontSize: 17, color: '#64748b', marginBottom: 48 }}>
            Des passionnés de tech et de restauration, tous basés au Luxembourg.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
            }}
          >
            {team.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                style={{
                  padding: 20,
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, hsl(${i * 60}, 70%, 70%), hsl(${i * 60 + 30}, 70%, 60%))`,
                    margin: '0 auto 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {p.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>{p.role}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <MapPin size={11} /> {p.city}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: '#fff',
        }}
      >
        <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, marginBottom: 16 }}>
          Rejoignez l'aventure
        </h2>
        <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 32 }}>
          500+ restaurants luxembourgeois nous font confiance.
        </p>
        <CTAButton to="/demo" variant="secondary" size="lg">
          Commencer maintenant
        </CTAButton>
      </section>
    </div>
  );
}
