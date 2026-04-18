import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, Clock, CheckCircle, AlertTriangle, Send, User,
  MessageSquare, ArrowUp, Mail, Phone, Zap,
} from 'lucide-react';

interface Ticket {
  id: string;
  client: string;
  subject: string;
  priority: 'Haute' | 'Normale' | 'Basse' | 'Urgente';
  status: 'Ouvert' | 'En cours' | 'Résolu';
  assignee: string;
  created: string;
  sla: number; // minutes remaining
  messages: { from: 'client' | 'support'; text: string; time: string }[];
}

const TICKETS: Ticket[] = [
  {
    id: '#4812', client: 'Café Namur', subject: 'Terminal Bluetooth ne répond plus',
    priority: 'Urgente', status: 'Ouvert', assignee: '—', created: 'il y a 4h', sla: -120,
    messages: [
      { from: 'client', text: 'Bonjour, notre terminal Bluetooth SumUp ne se connecte plus depuis ce matin. Impossible d\'encaisser les CB. Urgence !', time: '08:12' },
    ],
  },
  {
    id: '#4811', client: 'Brasserie LU', subject: 'Question sur facture INV-2026-0142',
    priority: 'Normale', status: 'En cours', assignee: 'Sophie M.', created: 'il y a 2h', sla: 180,
    messages: [
      { from: 'client', text: 'Je ne comprends pas la ligne "Module Loyalty" sur ma dernière facture.', time: '10:03' },
      { from: 'support', text: 'Bonjour, il s\'agit de votre abonnement au module Loyalty activé le 15 mars. Je vous envoie le détail par mail.', time: '10:18' },
    ],
  },
  {
    id: '#4810', client: 'Le Gourmand', subject: 'Demande nouvelle fonctionnalité — Export Excel',
    priority: 'Basse', status: 'Ouvert', assignee: '—', created: 'hier', sla: 720,
    messages: [
      { from: 'client', text: 'Serait-il possible d\'exporter les stats mensuelles au format Excel natif ?', time: 'hier 16:45' },
    ],
  },
  {
    id: '#4809', client: 'Chez Marco', subject: 'Synchro stocks entre 2 sites',
    priority: 'Haute', status: 'En cours', assignee: 'Bryan L.', created: 'hier', sla: 60,
    messages: [
      { from: 'client', text: 'Les stocks ne se synchronisent plus entre nos deux restaurants depuis lundi.', time: 'hier 14:22' },
      { from: 'support', text: 'Nous avons identifié le problème côté API. Correctif déployé dans l\'heure.', time: 'hier 15:10' },
    ],
  },
  {
    id: '#4808', client: 'Pizzeria Bella', subject: 'Comment annuler mon abonnement ?',
    priority: 'Normale', status: 'Ouvert', assignee: '—', created: 'hier', sla: 360,
    messages: [
      { from: 'client', text: 'Bonjour, nous souhaitons malheureusement arrêter notre abonnement fin du mois.', time: 'hier 11:08' },
    ],
  },
  {
    id: '#4807', client: 'Bar Le Coin', subject: 'Impression ticket caisse tronquée',
    priority: 'Haute', status: 'En cours', assignee: 'Thomas K.', created: '2j', sla: 30,
    messages: [
      { from: 'client', text: 'Les tickets imprimés sont coupés en bas. Urgent pour comptabilité.', time: '2j 09:34' },
    ],
  },
];

const TEMPLATES = [
  { label: 'Accusé réception', text: 'Bonjour, nous avons bien reçu votre demande et nous nous en occupons. Réponse sous 2h.' },
  { label: 'Demande de précisions', text: 'Bonjour, pouvez-vous nous préciser sur quel appareil vous rencontrez ce problème ?' },
  { label: 'Problème résolu', text: 'Bonjour, le problème est résolu. N\'hésitez pas si besoin. Bonne journée !' },
  { label: 'Escalation tech', text: 'Nous avons transmis votre demande à notre équipe technique. Réponse sous 24h.' },
];

const STATS = {
  open: TICKETS.filter(t => t.status === 'Ouvert').length,
  inProgress: TICKETS.filter(t => t.status === 'En cours').length,
  resolvedToday: 8,
  avgResponse: '42min',
};

export default function SupportPage() {
  const [selected, setSelected] = useState<Ticket>(TICKETS[0]);
  const [reply, setReply] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');

  const list = TICKETS.filter(t => statusFilter === 'Tous' || t.status === statusFilter);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Support client</h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
          {STATS.open + STATS.inProgress} tickets actifs · {STATS.resolvedToday} résolus aujourd'hui · Temps moyen {STATS.avgResponse}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPI label="Ouverts" value={STATS.open} icon={Inbox} color="#f87171" onClick={() => setStatusFilter('Ouvert')} />
        <KPI label="En cours" value={STATS.inProgress} icon={Clock} color="#fbbf24" onClick={() => setStatusFilter('En cours')} />
        <KPI label="Résolus aujourd'hui" value={STATS.resolvedToday} icon={CheckCircle} color="#4ade80" onClick={() => setStatusFilter('Résolu')} />
        <KPI label="Temps de réponse" value={STATS.avgResponse} icon={Zap} color="#a78bfa" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '360px 1fr 280px', gap: 16,
        height: 'calc(100vh - 320px)', minHeight: 520,
      }}>
        {/* Ticket list */}
        <div style={{
          background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 14, borderBottom: '1px solid #2a2a35', display: 'flex', gap: 6 }}>
            {['Tous', 'Ouvert', 'En cours', 'Résolu'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '6px 10px', background: statusFilter === s ? 'rgba(167,139,250,0.15)' : '#0a0a0f',
                border: `1px solid ${statusFilter === s ? '#a78bfa' : '#2a2a35'}`,
                color: statusFilter === s ? '#a78bfa' : '#94a3b8',
                borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {list.map(t => (
              <motion.button
                key={t.id}
                onClick={() => setSelected(t)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  width: '100%', padding: 14, textAlign: 'left',
                  background: selected.id === t.id ? 'rgba(167,139,250,0.1)' : 'transparent',
                  border: 'none', borderLeft: selected.id === t.id ? '3px solid #a78bfa' : '3px solid transparent',
                  borderBottom: '1px solid #2a2a35', cursor: 'pointer', color: '#e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#a78bfa' }}>{t.id}</span>
                  <PriorityBadge p={t.priority} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 }}>{t.client}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.subject}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                  <span>{t.created}</span>
                  <span style={{ color: t.sla < 0 ? '#f87171' : t.sla < 60 ? '#fbbf24' : '#94a3b8' }}>
                    SLA: {t.sla < 0 ? `dépassé ${Math.abs(t.sla)}min` : `${t.sla}min restantes`}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div style={{
          background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{selected.subject}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{selected.id} · {selected.client} · Assigné à {selected.assignee}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={iconBtn} title="Escalader"><ArrowUp size={14} /></button>
                <button style={iconBtn} title="Marquer résolu"><CheckCircle size={14} /></button>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence>
              {selected.messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    alignSelf: m.from === 'support' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    background: m.from === 'support' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#0a0a0f',
                    color: m.from === 'support' ? '#fff' : '#e2e8f0',
                    padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                    border: m.from === 'client' ? '1px solid #2a2a35' : 'none',
                  }}
                >
                  <div style={{ marginBottom: 4 }}>{m.text}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{m.time}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div style={{ padding: 14, borderTop: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => setReply(t.text)} style={{
                  padding: '4px 8px', background: '#0a0a0f', border: '1px solid #2a2a35',
                  borderRadius: 4, color: '#94a3b8', fontSize: 10, cursor: 'pointer',
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Écrire une réponse..."
                style={{
                  flex: 1, padding: '10px 12px', background: '#0a0a0f',
                  border: '1px solid #2a2a35', borderRadius: 8,
                  color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              />
              <button
                onClick={() => { setReply(''); alert('Réponse envoyée (mock)'); }}
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Send size={14} /> Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* Client sidebar */}
        <div style={{
          background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
          padding: 16, overflowY: 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            paddingBottom: 14, borderBottom: '1px solid #2a2a35',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 18,
            }}>{selected.client.charAt(0)}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{selected.client}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Client Pro · Depuis 2025</div>
            </div>
          </div>

          <SideRow label="Plan" value="Pro" />
          <SideRow label="MRR" value="129 €" />
          <SideRow label="Tickets ouverts" value="1" />
          <SideRow label="Tickets total" value="7" />
          <SideRow label="NPS" value="+8" color="#4ade80" />
          <SideRow label="Statut paiement" value="À jour" color="#4ade80" />

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #2a2a35', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button style={sideBtn}><Mail size={13} /> Envoyer email direct</button>
            <button style={sideBtn}><Phone size={13} /> Appeler</button>
            <button style={sideBtn}><User size={13} /> Voir fiche client</button>
          </div>

          <div style={{
            marginTop: 16, padding: 12, background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={11} /> Règle d'escalation
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
              Si SLA dépassé &gt; 1h, notifier Bryan L. automatiquement.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color, onClick }: any) {
  return (
    <div onClick={onClick} style={{
      background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12, padding: 18,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, marginBottom: 10,
        background: `${color}22`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const C: Record<string, string> = { Urgente: '#f87171', Haute: '#fb923c', Normale: '#60a5fa', Basse: '#94a3b8' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
      background: `${C[p]}22`, color: C[p],
    }}>{p}</span>
  );
}

function SideRow({ label, value, color = '#e2e8f0' }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 12 }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 6,
  background: '#0a0a0f', border: '1px solid #2a2a35',
  color: '#94a3b8', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const sideBtn: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: '#0a0a0f', border: '1px solid #2a2a35',
  color: '#e2e8f0', borderRadius: 6,
  fontSize: 12, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 8,
};
