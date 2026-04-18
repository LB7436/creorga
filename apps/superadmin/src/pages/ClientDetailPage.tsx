import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Gift, RefreshCw, Ban, Trash2, ChevronDown,
  TrendingUp, Users, Clock, FileText, MessageSquare, Activity,
  StickyNote, CheckCircle, XCircle, AlertCircle, Download,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import StatusBadge from '../components/StatusBadge';

const USAGE = [
  { d: '1', v: 42 }, { d: '5', v: 55 }, { d: '10', v: 48 }, { d: '15', v: 70 },
  { d: '20', v: 82 }, { d: '25', v: 75 }, { d: '30', v: 88 },
];

const MODULES = [
  { name: 'POS Caisse', usage: 92 }, { name: 'Réservations', usage: 78 },
  { name: 'Loyalty', usage: 64 }, { name: 'Delivery', usage: 51 },
  { name: 'Stocks', usage: 43 }, { name: 'AI Assistant', usage: 22 },
];

const INVOICES = [
  { id: 'INV-2026-0142', date: '01 Avr 2026', amount: 129, status: 'Payée' },
  { id: 'INV-2026-0098', date: '01 Mar 2026', amount: 129, status: 'Payée' },
  { id: 'INV-2026-0054', date: '01 Fév 2026', amount: 129, status: 'Payée' },
  { id: 'INV-2026-0012', date: '01 Jan 2026', amount: 129, status: 'Payée' },
  { id: 'INV-2025-1489', date: '01 Déc 2025', amount: 129, status: 'Payée' },
  { id: 'INV-2025-1398', date: '01 Nov 2025', amount: 129, status: 'Retard' },
];

const TICKETS = [
  { id: '#4521', subject: 'Problème de synchronisation terminal', priority: 'Haute', status: 'Résolu', date: '12 Avr 2026' },
  { id: '#4398', subject: 'Demande d\'ajout de module Delivery', priority: 'Normale', status: 'Résolu', date: '28 Mar 2026' },
  { id: '#4287', subject: 'Facture en double', priority: 'Basse', status: 'Résolu', date: '15 Mar 2026' },
];

const ACTIVITIES = [
  { who: 'Bryan L. (Admin)', what: 'A modifié le plan de Pro → Business', when: 'il y a 2h' },
  { who: 'Client', what: 'Connexion depuis Luxembourg', when: 'il y a 4h' },
  { who: 'Client', what: 'A ajouté 3 nouveaux utilisateurs', when: 'hier' },
  { who: 'Système', what: 'Facture #INV-2026-0142 générée', when: 'il y a 18j' },
  { who: 'Client', what: 'A activé le module Loyalty', when: 'il y a 22j' },
  { who: 'Support', what: 'A résolu le ticket #4521', when: 'il y a 24j' },
];

const NOTES = [
  { author: 'Bryan L.', text: 'Client très satisfait, bon candidat pour upsell Enterprise d\'ici Q3.', date: '10 Avr 2026' },
  { author: 'Sophie (Sales)', text: 'Intéressé par l\'intégration Lightspeed. À rappeler en mai.', date: '02 Avr 2026' },
  { author: 'Bryan L.', text: 'Premier client de Differdange. Peut servir de case study régional.', date: '15 Mar 2026' },
];

const TABS = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
  { key: 'usage', label: 'Utilisation', icon: Activity },
  { key: 'billing', label: 'Facturation', icon: FileText },
  { key: 'support', label: 'Support', icon: MessageSquare },
  { key: 'activity', label: 'Activité', icon: Clock },
  { key: 'notes', label: 'Notes CRM', icon: StickyNote },
];

export default function ClientDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState('overview');
  const [actionsOpen, setActionsOpen] = useState(false);

  const clientName = 'Brasserie Luxembourg';

  return (
    <div style={{ padding: 32 }}>
      <Link to="/clients" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#94a3b8', fontSize: 13, textDecoration: 'none', marginBottom: 16,
      }}>
        <ArrowLeft size={14} /> Retour aux clients
      </Link>

      {/* Header */}
      <div style={{
        background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
        padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, fontWeight: 700,
          }}>
            {clientName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, color: '#e2e8f0', fontWeight: 700 }}>
              {clientName}
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status="Business" size="md" />
              <StatusBadge status="Actif" size="md" />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>ID #{id} · Luxembourg · Client depuis Oct 2025</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              style={{
                background: '#0a0a0f', border: '1px solid #2a2a35',
                color: '#e2e8f0', padding: '10px 16px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              Actions <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {actionsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute', top: '110%', right: 0,
                    background: '#13131a', border: '1px solid #2a2a35',
                    borderRadius: 8, padding: 6, minWidth: 220, zIndex: 10,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  {[
                    { icon: Mail, label: 'Envoyer un email' },
                    { icon: Gift, label: 'Offrir un crédit' },
                    { icon: RefreshCw, label: 'Changer le plan' },
                    { icon: Ban, label: 'Suspendre', danger: false },
                    { icon: Trash2, label: 'Supprimer', danger: true },
                  ].map((a, i) => (
                    <button key={i} style={{
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '9px 12px', fontSize: 13, textAlign: 'left',
                      color: a.danger ? '#f87171' : '#e2e8f0', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10, borderRadius: 6,
                    }}>
                      <a.icon size={14} /> {a.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '1px solid #2a2a35',
      }}>
        {TABS.map(t => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 14px', background: 'transparent', border: 'none',
              color: tab === t.key ? '#a78bfa' : '#94a3b8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #a78bfa' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: -1,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'overview' && <Overview />}
          {tab === 'usage' && <Usage />}
          {tab === 'billing' && <Billing />}
          {tab === 'support' && <Support />}
          {tab === 'activity' && <ActivityTab />}
          {tab === 'notes' && <Notes />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Card({ title, children, action }: any) {
  return (
    <div style={{
      background: '#13131a', border: '1px solid #2a2a35',
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', margin: '6px 0 2px' }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>}
    </div>
  );
}

function Overview() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
      <Stat label="MRR Client" value="289 €" hint="+0 € ce mois" />
      <Stat label="LTV estimée" value="5 420 €" hint="Sur 24 mois" />
      <Stat label="CA Client via Creorga" value="124 800 €" hint="Sur 6 mois" />
      <Stat label="Utilisateurs actifs" value="8 / 10" hint="80% du siège" />
      <div style={{ gridColumn: 'span 4' }}>
        <Card title="Évolution du chiffre d'affaires du client">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={USAGE}>
              <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
              <XAxis dataKey="d" stroke="#64748b" style={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 8 }} />
              <Line type="monotone" dataKey="v" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Usage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Modules utilisés & fréquence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODULES.map(m => (
            <div key={m.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: '#e2e8f0' }}>{m.name}</span>
                <span style={{ color: '#94a3b8' }}>{m.usage}%</span>
              </div>
              <div style={{ height: 6, background: '#0a0a0f', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${m.usage}%` }}
                  transition={{ duration: 0.7 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Statistiques d'usage">
        <div style={{ display: 'grid', gap: 12 }}>
          <Stat label="Connexions (30j)" value="1 247" hint="Moy 41/j" />
          <Stat label="Heures d'usage" value="286 h" hint="Moy 9.5h/j" />
          <Stat label="Transactions POS" value="4 218" hint="Moy 140/j" />
          <Stat label="Taux d'adoption" value="87%" hint="Très élevé" />
        </div>
      </Card>
    </div>
  );
}

function Billing() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card title="Historique des factures" action={<button style={{
        background: 'transparent', border: '1px solid #2a2a35', color: '#94a3b8',
        padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5,
      }}><Download size={12} /> Exporter</button>}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: '8px 0', fontWeight: 600 }}>N°</th>
              <th style={{ padding: '8px 0', fontWeight: 600 }}>DATE</th>
              <th style={{ padding: '8px 0', fontWeight: 600 }}>MONTANT</th>
              <th style={{ padding: '8px 0', fontWeight: 600 }}>STATUT</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map(inv => (
              <tr key={inv.id} style={{ borderTop: '1px solid #2a2a35' }}>
                <td style={{ padding: '10px 0', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12 }}>{inv.id}</td>
                <td style={{ padding: '10px 0', color: '#94a3b8' }}>{inv.date}</td>
                <td style={{ padding: '10px 0', color: '#e2e8f0', fontWeight: 600 }}>{inv.amount} €</td>
                <td style={{ padding: '10px 0' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                    background: inv.status === 'Payée' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: inv.status === 'Payée' ? '#4ade80' : '#fbbf24',
                  }}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Méthodes de paiement">
        <div style={{ padding: 14, background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>Visa •••• 4242</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Expire 12/2027 · Par défaut</div>
        </div>
        <div style={{ padding: 14, background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>SEPA BIL•••456</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Prélèvement direct</div>
        </div>
        <div style={{ marginTop: 14, padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>1 facture en retard</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>INV-2025-1398 · 129 € · 142 jours</div>
        </div>
      </Card>
    </div>
  );
}

function Support() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card title="Historique des tickets">
        {TICKETS.map(t => (
          <div key={t.id} style={{
            padding: 14, borderTop: '1px solid #2a2a35',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{t.id} · {t.subject}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{t.date} · Priorité {t.priority}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
              background: 'rgba(34,197,94,0.15)', color: '#4ade80',
            }}>{t.status}</span>
          </div>
        ))}
      </Card>
      <Card title="Score de satisfaction">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#4ade80' }}>9.2</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>sur 10 · 3 évaluations</div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a2a35' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: '#94a3b8' }}>Temps de réponse moyen</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>2h 14min</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: '#94a3b8' }}>Tickets résolus</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>3 / 3</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#94a3b8' }}>NPS du client</span>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>+9</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ActivityTab() {
  return (
    <Card title="Journal d'activité">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ACTIVITIES.map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '12px 0',
            borderTop: i === 0 ? 'none' : '1px solid #2a2a35',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: a.who.includes('Admin') ? 'rgba(167,139,250,0.15)' : a.who === 'Système' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {a.who.includes('Admin') ? <AlertCircle size={14} color="#a78bfa" /> :
               a.who === 'Système' ? <CheckCircle size={14} color="#60a5fa" /> :
               <Users size={14} color="#4ade80" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                <strong>{a.who}</strong> — {a.what}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{a.when}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Notes() {
  const [newNote, setNewNote] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card title="Notes internes (CRM)">
        <textarea
          value={newNote} onChange={e => setNewNote(e.target.value)}
          placeholder="Ajouter une note interne sur ce client..."
          rows={3}
          style={{
            width: '100%', padding: 12, background: '#0a0a0f',
            border: '1px solid #2a2a35', borderRadius: 8,
            color: '#e2e8f0', fontSize: 13, outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', marginBottom: 10,
          }}
        />
        <button style={{
          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff',
          border: 'none', padding: '8px 14px', borderRadius: 6,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 20,
        }}>Ajouter la note</button>

        {NOTES.map((n, i) => (
          <div key={i} style={{
            padding: 14, background: '#0a0a0f', border: '1px solid #2a2a35',
            borderRadius: 8, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong style={{ color: '#a78bfa', fontSize: 12 }}>{n.author}</strong>
              <span style={{ fontSize: 11, color: '#64748b' }}>{n.date}</span>
            </div>
            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{n.text}</div>
          </div>
        ))}
      </Card>
      <Card title="Health Score & Actions">
        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%', margin: '0 auto',
            background: 'conic-gradient(#4ade80 0% 82%, #2a2a35 82% 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', background: '#13131a',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#4ade80' }}>82</div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Excellent</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
          Prochaines actions
        </div>
        {[
          { text: 'Proposer upsell Enterprise', done: false },
          { text: 'Rappel intégration Lightspeed (mai)', done: false },
          { text: 'Envoyer case study régional', done: true },
        ].map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            padding: '6px 0', color: a.done ? '#64748b' : '#e2e8f0',
            textDecoration: a.done ? 'line-through' : 'none',
          }}>
            {a.done ? <CheckCircle size={14} color="#4ade80" /> : <XCircle size={14} color="#64748b" />}
            {a.text}
          </div>
        ))}
      </Card>
    </div>
  );
}
