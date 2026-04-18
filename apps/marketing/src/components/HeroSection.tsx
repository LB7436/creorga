import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import CTAButton from './CTAButton';

export default function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 24px 120px',
        background:
          'radial-gradient(ellipse at top left, #eef2ff 0%, transparent 50%), radial-gradient(ellipse at top right, #fdf4ff 0%, transparent 50%), #ffffff',
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -50,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 99,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            color: '#6366f1',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          <Sparkles size={14} /> Nouveau · Assistant IA intégré
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: 'clamp(38px, 6vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: -2,
            marginBottom: 24,
          }}
        >
          Le POS qui transforme
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            votre restaurant
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 20,
            lineHeight: 1.5,
            color: '#475569',
            maxWidth: 680,
            margin: '0 auto 36px',
          }}
        >
          Caisse, réservations, stocks, RH, comptabilité — 27 modules pour piloter votre établissement.
          Conformité Luxembourg incluse.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}
        >
          <CTAButton to="/demo" size="lg">Essai gratuit 14 jours</CTAButton>
          <CTAButton to="/fonctionnalites" variant="secondary" size="lg" icon={false}>
            <Play size={16} fill="#0f172a" /> Voir la vidéo
          </CTAButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ fontSize: 13, color: '#64748b', marginBottom: 60 }}
        >
          Sans carte bancaire · Sans engagement · Installation en 1 jour
        </motion.div>

        {/* Dashboard mock */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 40px 80px -20px rgba(99,102,241,0.25), 0 20px 40px -10px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            background: '#fff',
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <div
              style={{
                marginLeft: 12,
                fontSize: 12,
                color: '#64748b',
                padding: '4px 10px',
                background: '#fff',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
              }}
            >
              app.creorga.lu/dashboard
            </div>
          </div>

          {/* Mock dashboard */}
          <div style={{ padding: 24, background: 'linear-gradient(180deg, #fafbff, #ffffff)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {[
                { label: 'CA du jour', value: '4 872 €', color: '#6366f1' },
                { label: 'Couverts', value: '187', color: '#a855f7' },
                { label: 'Ticket moyen', value: '26,04 €', color: '#ec4899' },
                { label: 'Marge', value: '68 %', color: '#10b981' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: 14,
                    background: '#fff',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: 16,
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  height: 180,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                }}
              >
                {[60, 85, 45, 92, 70, 78, 95, 82, 65, 88, 72, 90].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: `linear-gradient(180deg, #a855f7, #6366f1)`,
                      borderRadius: '4px 4px 0 0',
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  padding: 16,
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Top produits</div>
                {['Burger maison', 'Pizza Regina', 'Salade César', 'Tiramisu'].map((p, i) => (
                  <div
                    key={p}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      padding: '6px 0',
                      borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <span>{p}</span>
                    <span style={{ fontWeight: 700, color: '#6366f1' }}>{47 - i * 8}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
