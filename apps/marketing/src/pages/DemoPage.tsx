import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Check, Video, User } from 'lucide-react';

const slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

function nextDays(n: number) {
  const out: Date[] = [];
  const d = new Date();
  for (let i = 1; out.length < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    if (x.getDay() !== 0 && x.getDay() !== 6) out.push(x);
  }
  return out;
}

export default function DemoPage() {
  const [step, setStep] = useState<'pick' | 'form' | 'done'>('pick');
  const [date, setDate] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    type: 'restaurant',
    size: '1-5',
    message: '',
  });

  const days = nextDays(10);

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
          background: 'radial-gradient(ellipse at top, #faf5ff 0%, transparent 60%), #fff',
        }}
      >
        <div
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
            marginBottom: 20,
          }}
        >
          <Video size={14} color="#6366f1" /> Démo gratuite · 30 minutes
        </div>
        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            letterSpacing: -2,
            marginBottom: 16,
          }}
        >
          Voyez Creorga en action
        </h1>
        <p style={{ fontSize: 18, color: '#64748b', maxWidth: 600, margin: '0 auto' }}>
          Un expert vous montre la plateforme, adaptée à votre métier. Aucune obligation.
        </p>
      </section>

      <section style={{ padding: '40px 24px 100px' }}>
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}
        >
          {/* Steps */}
          <div
            style={{
              padding: '20px 32px',
              background: '#fafbff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              gap: 16,
              fontSize: 13,
              fontWeight: 600,
              color: '#64748b',
            }}
          >
            {['Créneau', 'Vos infos', 'Confirmation'].map((s, i) => {
              const active = (step === 'pick' && i === 0) || (step === 'form' && i === 1) || (step === 'done' && i === 2);
              const done = (step === 'form' && i === 0) || (step === 'done' && i < 2);
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: active || done ? '#6366f1' : '#e2e8f0',
                      color: active || done ? '#fff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span style={{ color: active ? '#6366f1' : '#64748b' }}>{s}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 32 }}>
            {step === 'pick' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={20} /> Choisissez un jour
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
                  Les démos se font en visio (Google Meet). Durée : 30 min.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                    marginBottom: 28,
                  }}
                >
                  {days.map((d) => {
                    const sel = date && d.toDateString() === date.toDateString();
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => setDate(d)}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 10,
                          border: sel ? '2px solid #6366f1' : '1px solid #e2e8f0',
                          background: sel ? '#eef2ff' : '#fff',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                          {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: sel ? '#6366f1' : '#0f172a' }}>
                          {d.getDate()}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                          {d.toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {date && (
                  <>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} /> Créneaux disponibles
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: 8,
                        marginBottom: 28,
                      }}
                    >
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSlot(s)}
                          style={{
                            padding: '10px',
                            borderRadius: 8,
                            border: slot === s ? '2px solid #6366f1' : '1px solid #e2e8f0',
                            background: slot === s ? '#eef2ff' : '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            color: slot === s ? '#6366f1' : '#0f172a',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={!slot}
                      onClick={() => setStep('form')}
                      style={{
                        padding: '14px 28px',
                        borderRadius: 12,
                        background: slot ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#cbd5e1',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: slot ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Continuer
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {step === 'form' && (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep('done');
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={20} /> Vos informations
                </h2>
                <div
                  style={{
                    padding: 12,
                    background: '#eef2ff',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#4338ca',
                    fontWeight: 600,
                  }}
                >
                  📅 Démo confirmée pour le{' '}
                  {date!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {slot}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Nom *</label>
                    <input style={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Email pro *</label>
                    <input type="email" style={input} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Établissement *</label>
                    <input style={input} required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Téléphone</label>
                    <input type="tel" style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Type</label>
                    <select style={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="restaurant">Restaurant</option>
                      <option value="bar">Bar / Café</option>
                      <option value="hotel">Hôtel</option>
                      <option value="brasserie">Brasserie</option>
                      <option value="chain">Chaîne / Franchise</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Équipe</label>
                    <select style={input} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                      <option value="1-5">1-5 personnes</option>
                      <option value="6-20">6-20 personnes</option>
                      <option value="21-50">21-50 personnes</option>
                      <option value="50+">50+ personnes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Un besoin particulier ?</label>
                  <textarea rows={3} style={{ ...input, resize: 'vertical' }} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStep('pick')}
                    style={{
                      padding: '14px 24px',
                      borderRadius: 12,
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Confirmer la démo
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '32px 0' }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24,
                    boxShadow: '0 20px 40px -10px rgba(16,185,129,0.5)',
                  }}
                >
                  <Check size={40} />
                </div>
                <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 12 }}>
                  C'est confirmé !
                </h2>
                <p style={{ fontSize: 17, color: '#64748b', marginBottom: 24 }}>
                  Rendez-vous le{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {date!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {slot}
                  </strong>
                  .<br />
                  Une invitation Google Meet vient d'être envoyée à <strong style={{ color: '#6366f1' }}>{form.email}</strong>.
                </p>
                <div
                  style={{
                    padding: 20,
                    background: '#fafbff',
                    borderRadius: 12,
                    maxWidth: 480,
                    margin: '0 auto',
                    fontSize: 14,
                    color: '#334155',
                    textAlign: 'left',
                  }}
                >
                  <strong>En attendant :</strong>
                  <ul style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.8 }}>
                    <li>Préparez vos questions sur votre workflow actuel</li>
                    <li>Notez vos outils à remplacer</li>
                    <li>Pensez à votre volume mensuel de commandes</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
