import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('bryan@creorga.lu');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@') || password.length < 4) {
      setError('Identifiants invalides.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 700);
  };

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.join('').length !== 6) {
      setError('Code OTP incomplet.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 600);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -100, right: -100, width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, left: -150, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%', maxWidth: 440,
          background: '#13131a',
          border: '1px solid #2a2a35',
          borderRadius: 16,
          padding: 40,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 30px rgba(167,139,250,0.3)',
          }}
        >
          <ShieldCheck size={32} color="#fff" />
        </motion.div>

        <h1 style={{
          textAlign: 'center', fontSize: 24, fontWeight: 700,
          color: '#e2e8f0', margin: '0 0 6px',
        }}>
          Super-Admin Creorga
        </h1>
        <p style={{
          textAlign: 'center', color: '#94a3b8', fontSize: 13,
          margin: '0 0 28px',
        }}>
          Seul le fondateur Creorga peut se connecter ici
        </p>

        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          justifyContent: 'center',
        }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              height: 4, width: 48, borderRadius: 2,
              background: step >= s ? '#a78bfa' : '#2a2a35',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              EMAIL FONDATEUR
            </label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#64748b' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '11px 12px 11px 38px',
                  background: '#0a0a0f', border: '1px solid #2a2a35',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              MOT DE PASSE
            </label>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#64748b' }} />
              <input
                type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={{
                  width: '100%', padding: '11px 40px 11px 38px',
                  background: '#0a0a0f', border: '1px solid #2a2a35',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 10, top: 10, background: 'transparent',
                border: 'none', color: '#64748b', cursor: 'pointer', padding: 4,
              }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px',
              background: loading ? '#2a2a35' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(167,139,250,0.25)',
            }}>
              {loading ? 'Vérification...' : 'Continuer'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: 8, marginBottom: 20,
            }}>
              <KeyRound size={18} color="#a78bfa" />
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                Entrez le code à 6 chiffres de votre app authenticator.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={el => (otpRefs.current[i] = el)}
                  type="text" inputMode="numeric" maxLength={1} value={v}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  style={{
                    width: 48, height: 56,
                    background: '#0a0a0f',
                    border: `1px solid ${v ? '#a78bfa' : '#2a2a35'}`,
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: 22, fontWeight: 700,
                    textAlign: 'center', outline: 'none',
                    transition: 'border 0.15s',
                  }}
                />
              ))}
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px',
              background: loading ? '#2a2a35' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              marginBottom: 10,
            }}>
              {loading ? 'Authentification...' : 'Se connecter'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{
              width: '100%', padding: '10px',
              background: 'transparent', color: '#94a3b8',
              border: '1px solid #2a2a35', borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}>
              Retour
            </button>
          </form>
        )}

        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: '1px solid #2a2a35',
          fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 1.6,
        }}>
          Connexion sécurisée · IP loggée · 2FA obligatoire<br />
          © Creorga OS · Luxembourg
        </div>
      </motion.div>
    </div>
  );
}
