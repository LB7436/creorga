import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Calendar, QrCode, Monitor, ChefHat, Package, Truck, BookOpen, ShieldCheck,
  Users, Clock, Wallet, HeartHandshake, Gift, Mail, Ticket,
  Calculator, Receipt, FileText, CreditCard,
  BarChart3, PieChart, Brain,
  Building2, Network, Code2, Smartphone,
} from 'lucide-react';
import CTAButton from '../components/CTAButton';

const categories = [
  { key: 'core', label: 'Core' },
  { key: 'business', label: 'Business' },
  { key: 'admin', label: 'Admin' },
  { key: 'digital', label: 'Digital' },
] as const;

type Cat = typeof categories[number]['key'];

const data: Record<Cat, { icon: any; title: string; bullets: string[] }[]> = {
  core: [
    { icon: ShoppingCart, title: 'POS Caisse', bullets: ['Interface tactile ultra-rapide', 'Mode offline automatique', 'Encaissement multi-moyens'] },
    { icon: Calendar, title: 'Réservations', bullets: ['Calendrier temps réel', 'Rappels SMS/email', 'Déposits carte bancaire'] },
    { icon: QrCode, title: 'QR Menu', bullets: ['Menu digital multilingue', 'Commande à table', 'Paiement in-app'] },
    { icon: Monitor, title: 'Kitchen Display', bullets: ['KDS par poste', 'Timers automatiques', 'Notifications serveurs'] },
    { icon: ChefHat, title: 'Commandes en ligne', bullets: ['Site de commande clé en main', 'Click & collect', 'Livraison intégrée'] },
  ],
  business: [
    { icon: Package, title: 'Gestion stocks', bullets: ['Inventaires par zone', 'Alertes rupture', 'Valorisation FIFO/PMP'] },
    { icon: Truck, title: 'Fournisseurs', bullets: ['Bons de commande auto', 'Catalogues prix', 'Rapprochement factures'] },
    { icon: BookOpen, title: 'Recettes & coûts', bullets: ['Food cost par plat', 'Fiches techniques', 'Allergènes auto'] },
    { icon: ShieldCheck, title: 'HACCP', bullets: ['Températures Bluetooth', 'Traçabilité complète', 'Export contrôle sanitaire'] },
    { icon: Users, title: 'RH & plannings', bullets: ['Planning drag & drop', 'Prévisions effectifs', 'Demandes congés'] },
    { icon: Clock, title: 'Pointeuse', bullets: ['Badge NFC / QR', 'Heures sup auto', 'Export paie'] },
    { icon: Wallet, title: 'Paie', bullets: ['Calcul brut/net LU', 'Fichiers CCSS', 'Bulletins PDF'] },
    { icon: HeartHandshake, title: 'CRM clients', bullets: ['Historique 360°', 'Segmentation auto', 'RGPD / CNPD natif'] },
    { icon: Gift, title: 'Fidélité', bullets: ['Points & cashback', 'Paliers VIP', 'Cartes digitales'] },
    { icon: Mail, title: 'Marketing email', bullets: ['Templates prêts', 'Automation', 'A/B testing'] },
    { icon: Ticket, title: 'Cadeaux & bons', bullets: ['Vente en ligne', 'Validation POS', 'Suivi utilisation'] },
  ],
  admin: [
    { icon: Calculator, title: 'Comptabilité', bullets: ['Grand livre intégré', 'Export FEC/FAIA', 'Lettrage auto'] },
    { icon: Receipt, title: 'TVA Luxembourg', bullets: ['Taux 3/8/14/17 %', 'Déclaration e-CDF', 'Autoliquidation UE'] },
    { icon: FileText, title: 'Facturation', bullets: ['Devis + facture', 'Relances auto', 'Paiement en ligne'] },
    { icon: CreditCard, title: 'Dépenses', bullets: ['Scan reçus OCR', 'Validation workflow', 'Notes de frais'] },
    { icon: BarChart3, title: 'Analytics', bullets: ['100+ KPIs pré-configurés', 'Drill-down illimité', 'Export Excel/PDF'] },
    { icon: PieChart, title: 'Reports', bullets: ['Rapports programmés', 'Envoi automatique', 'Tableaux de bord'] },
  ],
  digital: [
    { icon: Brain, title: 'Forecasting IA', bullets: ['Prévision ventes J+7', 'Optimisation stocks', 'Staff scheduling'] },
    { icon: Building2, title: 'Multi-sites', bullets: ['Console consolidée', 'Permissions fines', 'Reporting groupe'] },
    { icon: Network, title: 'Franchise', bullets: ['Royalties auto', 'Standards corporate', 'Benchmark sites'] },
    { icon: Code2, title: 'API & webhooks', bullets: ['REST + GraphQL', 'Event streaming', '50+ intégrations'] },
    { icon: Smartphone, title: 'App mobile', bullets: ['iOS & Android', 'Gérant en mobilité', 'Notifications push'] },
  ],
};

function useCounter(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function FeaturesPage() {
  const [cat, setCat] = useState<Cat>('core');
  const totalModules = useCounter(27);

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at top, #faf5ff 0%, transparent 60%), #fff',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              letterSpacing: -2,
              marginBottom: 20,
            }}
          >
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{totalModules}</span> modules
            <br />pour tout gérer
          </h1>
          <p style={{ fontSize: 19, color: '#64748b' }}>
            Une suite complète, pensée pour la restauration luxembourgeoise.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: 6,
              background: '#f1f5f9',
              borderRadius: 14,
              width: 'fit-content',
              margin: '0 auto 48px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  background: cat === c.key ? '#fff' : 'transparent',
                  color: cat === c.key ? '#6366f1' : '#64748b',
                  boxShadow: cat === c.key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {data[cat].map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -4 }}
                  style={{
                    padding: 24,
                    borderRadius: 14,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
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
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={22} color="#6366f1" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{m.title}</h3>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.bullets.map((b) => (
                      <li key={b} style={{ fontSize: 13, color: '#64748b', paddingLeft: 14, position: 'relative' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 6,
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#a855f7',
                          }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* Tiny screenshot mock */}
                  <div
                    style={{
                      marginTop: 18,
                      height: 80,
                      borderRadius: 8,
                      background:
                        'linear-gradient(135deg, #eef2ff 0%, #fdf4ff 100%)',
                      border: '1px solid #e2e8f0',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        right: 8,
                        height: 10,
                        borderRadius: 4,
                        background: '#fff',
                        opacity: 0.7,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        width: '60%',
                        height: 22,
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '60px 24px',
          textAlign: 'center',
          background: '#fafbff',
        }}
      >
        <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 16 }}>
          Envie de voir tout ça en action ?
        </h2>
        <p style={{ fontSize: 17, color: '#64748b', marginBottom: 28 }}>
          Nos experts vous montrent Creorga en 30 minutes, adapté à votre métier.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <CTAButton to="/demo" size="lg">Réserver une démo</CTAButton>
          <CTAButton to="/tarifs" variant="secondary" size="lg">Voir les tarifs</CTAButton>
        </div>
      </section>
    </div>
  );
}
