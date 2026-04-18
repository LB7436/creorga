import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'demo',
    message: '',
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const input: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 14,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    outline: 'none',
  };

  return (
    <div>
      <section
        style={{
          padding: '80px 24px 40px',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at top, #eef2ff 0%, transparent 60%), #fff',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            letterSpacing: -2,
            marginBottom: 16,
          }}
        >
          Parlons de votre projet
        </h1>
        <p style={{ fontSize: 18, color: '#64748b' }}>
          Notre équipe vous répond en moins de 2h ouvrées.
        </p>
      </section>

      <section style={{ padding: '40px 24px 100px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            alignItems: 'flex-start',
          }}
        >
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 32,
              borderRadius: 18,
              background: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Check size={28} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Message envoyé !</h3>
                <p style={{ color: '#64748b' }}>
                  On vous recontacte sous 2 heures ouvrées.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Formulaire de contact</h2>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Nom complet *</label>
                  <input style={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Email *</label>
                    <input type="email" style={input} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Téléphone</label>
                    <input type="tel" style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Sujet</label>
                  <select style={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                    <option value="demo">Demander une démo</option>
                    <option value="pricing">Question tarifs</option>
                    <option value="support">Support</option>
                    <option value="partnership">Partenariat</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Message *</label>
                  <textarea
                    rows={5}
                    style={{ ...input, resize: 'vertical' }}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 10px 30px -10px rgba(99,102,241,0.6)',
                  }}
                >
                  Envoyer <Send size={16} />
                </button>
              </form>
            )}
          </motion.div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: Phone, label: 'Téléphone', value: '+352 27 12 34 56', sub: 'Lun-Ven 8h-19h · Sam 9h-13h' },
              { icon: Mail, label: 'Email', value: 'hello@creorga.lu', sub: 'Réponse sous 2h ouvrées' },
              { icon: MapPin, label: 'Adresse', value: '15 Rue du Commerce, L-3650 Rumelange', sub: 'Luxembourg' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  style={{
                    padding: 20,
                    borderRadius: 14,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color="#6366f1" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>
                      {item.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{item.value}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              );
            })}

            {/* Map mock */}
            <div
              style={{
                height: 220,
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                background:
                  'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #fce7f3 100%)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Roads */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.6)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '60%', width: 3, background: 'rgba(255,255,255,0.6)' }} />
              <div style={{ position: 'absolute', top: '30%', left: '20%', right: '30%', height: 2, background: 'rgba(255,255,255,0.4)' }} />

              {/* Pin */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '60%',
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div
                  style={{
                    background: '#6366f1',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Creorga HQ
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50% 50% 50% 0',
                    background: '#6366f1',
                    transform: 'rotate(-45deg)',
                    margin: '0 auto',
                    boxShadow: '0 6px 14px rgba(99,102,241,0.5)',
                  }}
                />
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#475569',
                  background: 'rgba(255,255,255,0.8)',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                Rumelange, Luxembourg
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
