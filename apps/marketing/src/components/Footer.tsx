import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Twitter, Mail } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer
      style={{
        background: '#0f172a',
        color: '#cbd5e1',
        padding: '64px 24px 32px',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 48,
            marginBottom: 48,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                }}
              >
                C
              </div>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>Creorga OS</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              La plateforme tout-en-un pour restaurants, bars et hôtels. Née au Luxembourg, pensée pour l'Europe.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[Facebook, Instagram, Linkedin, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#cbd5e1',
                  }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Produit</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><Link to="/fonctionnalites" style={{ fontSize: 14 }}>Fonctionnalités</Link></li>
              <li><Link to="/tarifs" style={{ fontSize: 14 }}>Tarifs</Link></li>
              <li><Link to="/demo" style={{ fontSize: 14 }}>Demander une démo</Link></li>
              <li><a href="#" style={{ fontSize: 14 }}>Changelog</a></li>
              <li><a href="#" style={{ fontSize: 14 }}>Roadmap</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Entreprise</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><Link to="/a-propos" style={{ fontSize: 14 }}>À propos</Link></li>
              <li><Link to="/contact" style={{ fontSize: 14 }}>Contact</Link></li>
              <li><a href="#" style={{ fontSize: 14 }}>Carrières</a></li>
              <li><a href="#" style={{ fontSize: 14 }}>Presse</a></li>
              <li><a href="#" style={{ fontSize: 14 }}>Partenaires</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Newsletter</h4>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Recevez les actus restauration & conformité LU.
            </p>
            {subscribed ? (
              <div style={{ fontSize: 13, color: '#34d399' }}>Merci, à bientôt !</div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubscribed(true);
                }}
                style={{ display: 'flex', gap: 6 }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.lu"
                  required
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 13,
                    borderRadius: 8,
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                  }}
                >
                  <Mail size={16} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div
          style={{
            paddingTop: 32,
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          <div>
            © {new Date().getFullYear()} Creorga S.à r.l. — 15 Rue du Commerce, L-3650 Rumelange, Luxembourg
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#">Mentions légales</a>
            <a href="#">CGU</a>
            <a href="#">Politique CNPD</a>
            <a href="#">Cookies</a>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
          RCS Luxembourg B 123456 · TVA LU12345678 · Agrément ministériel 10123456
        </div>
      </div>
    </footer>
  );
}
