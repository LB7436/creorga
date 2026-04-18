import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LifeBuoy, AlertTriangle, CheckCircle2, Clock, Send, Paperclip,
  User, Mail, Phone, Building2, BookOpen,
} from 'lucide-react';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

interface Ticket {
  id: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  plan: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'Nouveau' | 'En cours' | 'Attente client' | 'Résolu';
  assignee: string;
  sla: string;
  slaHot: boolean;
  created: string;
  messages: { from: 'client' | 'admin'; author: string; text: string; time: string }[];
}

const TICKETS: Ticket[] = [
  {
    id: 'T-5012', client: 'Café Rond-Point', clientEmail: 'contact@cafe-rumelange.lu',
    clientPhone: '+352 27 12 34 56', plan: 'Pro',
    subject: "Impossible d'imprimer les tickets", priority: 'urgent', status: 'En cours',
    assignee: 'Bryan L.', sla: '00:23', slaHot: true, created: '2026-04-18 10:12',
    messages: [
      { from: 'client', author: 'Jean R.', text: "Depuis ce matin l'imprimante ne répond plus, urgence nous ouvrons à 11h30.", time: '10:12' },
      { from: 'admin', author: 'Bryan L.', text: "Bonjour Jean, je regarde ça tout de suite. Pouvez-vous vérifier le voyant LED sur l'imprimante ?", time: '10:18' },
      { from: 'client', author: 'Jean R.', text: 'Rouge clignotant.', time: '10:22' },
    ],
  },
  { id: 'T-5011', client: 'Bistro Maxim', clientEmail: 'info@bistromaxim.lu', clientPhone: '+352 26 11 22 33', plan: 'Starter', subject: 'Question facturation TVA', priority: 'medium', status: 'Nouveau', assignee: 'Non assigné', sla: '03:48', slaHot: false, created: '2026-04-18 09:45', messages: [{ from: 'client', author: 'Anne B.', text: 'La TVA sur ma facture est à 16% au lieu de 17%.', time: '09:45' }] },
  { id: 'T-5010', client: 'Pizza Napoli', clientEmail: 'napoli@mail.lu', clientPhone: '+352 26 99 88 77', plan: 'Starter', subject: 'Ajout utilisateur admin', priority: 'low', status: 'Résolu', assignee: 'Marie D.', sla: '—', slaHot: false, created: '2026-04-17 16:00', messages: [] },
  { id: 'T-5009', client: 'Chez Marie', clientEmail: 'marie@chezmarie.fr', clientPhone: '+33 3 82 11 22 33', plan: 'Pro', subject: 'Formation module stocks', priority: 'low', status: 'En cours', assignee: 'Marie D.', sla: '12:14', slaHot: false, created: '2026-04-17 14:30', messages: [] },
  { id: 'T-5008', client: 'Brasserie Nord', clientEmail: 'brass.nord@mail.lu', clientPhone: '+352 28 22 11 00', plan: 'Business', subject: 'Intégration Stripe échoue', priority: 'high', status: 'En cours', assignee: 'Bryan L.', sla: '01:02', slaHot: true, created: '2026-04-18 08:00', messages: [] },
  { id: 'T-5007', client: 'Le Gourmet', clientEmail: 'info@legourmet.lu', clientPhone: '+352 27 00 11 22', plan: 'Pro', subject: 'Export Excel tronqué', priority: 'medium', status: 'Attente client', assignee: 'Bryan L.', sla: '—', slaHot: false, created: '2026-04-16 11:15', messages: [] },
  { id: 'T-5006', client: 'Snack Corner', clientEmail: 'snack@corner.lu', clientPhone: '+352 26 55 66 77', plan: 'Starter', subject: 'Connexion impossible', priority: 'high', status: 'Résolu', assignee: 'Bryan L.', sla: '—', slaHot: false, created: '2026-04-16 09:22', messages: [] },
  { id: 'T-5005', client: 'Café Central', clientEmail: 'cafe@central.lu', clientPhone: '+352 27 33 44 55', plan: 'Starter', subject: 'Changer plan', priority: 'low', status: 'Nouveau', assignee: 'Non assigné', sla: '04:22', slaHot: false, created: '2026-04-18 08:30', messages: [] },
  { id: 'T-5004', client: 'Taverne du Parc', clientEmail: 'parc@taverne.lu', clientPhone: '+352 26 77 88 99', plan: 'Pro', subject: 'Module marketing — prix', priority: 'low', status: 'Nouveau', assignee: 'Non assigné', sla: '05:10', slaHot: false, created: '2026-04-18 07:55', messages: [] },
  { id: 'T-5003', client: 'La Fourchette', clientEmail: 'f@fourchette.lu', clientPhone: '+352 27 55 44 33', plan: 'Pro', subject: 'QR menu affichage mobile', priority: 'medium', status: 'En cours', assignee: 'Marie D.', sla: '02:30', slaHot: false, created: '2026-04-17 18:42', messages: [] },
  { id: 'T-5002', client: 'Le Petit Coin', clientEmail: 'petit@coin.lu', clientPhone: '+352 26 00 99 88', plan: 'Starter', subject: 'Demande de remboursement', priority: 'high', status: 'En cours', assignee: 'Bryan L.', sla: '00:45', slaHot: true, created: '2026-04-18 09:00', messages: [] },
  { id: 'T-5001', client: 'Chez Antoine', clientEmail: 'antoine@resto.fr', clientPhone: '+33 3 87 00 11 22', plan: 'Pro', subject: 'Bug calcul pourboire', priority: 'medium', status: 'En cours', assignee: 'Marie D.', sla: '03:15', slaHot: false, created: '2026-04-17 17:10', messages: [] },
  { id: 'T-5000', client: 'Bar du Port', clientEmail: 'port@bar.be', clientPhone: '+32 4 11 22 33 44', plan: 'Starter', subject: 'Commande matériel', priority: 'low', status: 'Résolu', assignee: 'Marie D.', sla: '—', slaHot: false, created: '2026-04-16 13:33', messages: [] },
  { id: 'T-4999', client: 'Brasserie Est', clientEmail: 'est@brass.de', clientPhone: '+49 6 81 22 33 44', plan: 'Business', subject: 'Question conformité RGPD', priority: 'medium', status: 'Nouveau', assignee: 'Non assigné', sla: '02:20', slaHot: false, created: '2026-04-18 10:30', messages: [] },
  { id: 'T-4998', client: 'Café des Arts', clientEmail: 'arts@cafe.lu', clientPhone: '+352 26 11 00 99', plan: 'Pro', subject: 'Mise à jour menu bug', priority: 'low', status: 'Résolu', assignee: 'Bryan L.', sla: '—', slaHot: false, created: '2026-04-16 10:10', messages: [] },
  { id: 'T-4997', client: 'Le Refuge', clientEmail: 'r@refuge.lu', clientPhone: '+352 27 22 11 00', plan: 'Pro', subject: 'Impression ticket coupé', priority: 'medium', status: 'En cours', assignee: 'Bryan L.', sla: '04:05', slaHot: false, created: '2026-04-17 20:00', messages: [] },
  { id: 'T-4996', client: 'Chez Pierre', clientEmail: 'p@chezpierre.fr', clientPhone: '+33 3 82 44 55 66', plan: 'Starter', subject: 'Changer email admin', priority: 'low', status: 'Résolu', assignee: 'Marie D.', sla: '—', slaHot: false, created: '2026-04-16 15:22', messages: [] },
  { id: 'T-4995', client: 'La Terrasse', clientEmail: 'terrasse@mail.lu', clientPhone: '+352 26 33 44 55', plan: 'Pro', subject: 'Comment configurer happy hour', priority: 'low', status: 'Résolu', assignee: 'Marie D.', sla: '—', slaHot: false, created: '2026-04-16 11:00', messages: [] },
  { id: 'T-4994', client: 'Bistrot 22', clientEmail: 'bistrot22@lu.lu', clientPhone: '+352 27 99 88 77', plan: 'Starter', subject: 'Reset mot de passe', priority: 'medium', status: 'Résolu', assignee: 'Bryan L.', sla: '—', slaHot: false, created: '2026-04-17 08:00', messages: [] },
  { id: 'T-4993', client: 'Pizza Express', clientEmail: 'pizza@express.lu', clientPhone: '+352 26 88 77 66', plan: 'Starter', subject: 'Demande devis Pro', priority: 'low', status: 'Nouveau', assignee: 'Non assigné', sla: '06:00', slaHot: false, created: '2026-04-18 06:45', messages: [] },
];

const cannedResponses = [
  { name: 'Accueil', text: 'Bonjour, merci pour votre message. Je prends en charge votre demande immédiatement.' },
  { name: "Demande d'info", text: "Pourriez-vous nous préciser la version du POS ainsi qu'une capture d'écran de l'erreur ?" },
  { name: 'Ticket résolu', text: 'Votre problème est résolu. Pouvez-vous confirmer de votre côté ? Excellente journée !' },
  { name: 'Escalade', text: "Votre demande nécessite l'attention d'un ingénieur. Un retour sous 2h ouvrées." },
];

export default function SupportPage() {
  const [selected, setSelected] = useState<Ticket | null>(TICKETS[0]);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = TICKETS.filter((t) => filter === 'all' || t.status === filter);

  const stats = {
    open: TICKETS.filter((t) => t.status === 'Nouveau').length,
    progress: TICKETS.filter((t) => t.status === 'En cours').length,
    resolved: TICKETS.filter((t) => t.status === 'Résolu').length,
    avg: '1h42',
  };

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Support</h1>
        <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>File d'attente et conversations</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Nouveaux" value={stats.open} icon={AlertTriangle} color="#f59e0b" />
        <StatCard label="En cours" value={stats.progress} icon={Clock} color="#3b82f6" />
        <StatCard label="Résolus aujourd'hui" value={stats.resolved} icon={CheckCircle2} color="#10b981" />
        <StatCard label="Temps moyen réponse" value={stats.avg} icon={LifeBuoy} color={ACCENT} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '400px 1fr 320px', gap: 16,
        height: 'calc(100vh - 280px)', minHeight: 500,
      }}>
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'Nouveau', 'En cours', 'Résolu'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? 'rgba(167,139,250,0.15)' : 'transparent',
                  color: filter === f ? ACCENT : MUTED,
                  border: `1px solid ${filter === f ? ACCENT : BORDER}`,
                  padding: '5px 10px', borderRadius: 6, fontSize: 11,
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {f === 'all' ? 'Tous' : f}
              </button>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                active={selected?.id === t.id}
                onClick={() => setSelected(t)}
              />
            ))}
          </div>
        </div>

        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {selected ? (
            <>
              <div style={{ padding: 16, borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{selected.id}</div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{selected.subject}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <PriorityBadge priority={selected.priority} />
                  <StatusBadge status={selected.status} />
                  {selected.slaHot && (
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444',
                      padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <AlertTriangle size={10} /> SLA {selected.sla}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
                {selected.messages.length === 0 ? (
                  <div style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Aucun message encore.</div>
                ) : (
                  selected.messages.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 14,
                        display: 'flex',
                        justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        maxWidth: '78%',
                        background: m.from === 'admin' ? 'rgba(167,139,250,0.15)' : BG,
                        border: `1px solid ${m.from === 'admin' ? ACCENT + '40' : BORDER}`,
                        borderRadius: 10, padding: 12,
                      }}>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
                          {m.author} • {m.time}
                        </div>
                        <div style={{ fontSize: 13 }}>{m.text}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: 14, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {cannedResponses.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setReply(c.text)}
                      style={{
                        background: BG, border: `1px solid ${BORDER}`, color: MUTED,
                        padding: '4px 8px', borderRadius: 5, fontSize: 10,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <BookOpen size={10} /> {c.name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Votre réponse..."
                    rows={2}
                    style={{
                      flex: 1, background: BG, border: `1px solid ${BORDER}`,
                      borderRadius: 7, color: TEXT, padding: 10, fontSize: 13,
                      resize: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button style={{
                    background: 'transparent', border: `1px solid ${BORDER}`,
                    color: MUTED, padding: 9, borderRadius: 7, cursor: 'pointer',
                  }}><Paperclip size={14} /></button>
                  <button
                    onClick={() => setReply('')}
                    style={{
                      background: ACCENT, border: 'none', color: '#fff',
                      padding: '9px 14px', borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
                    }}
                  >
                    <Send size={13} /> Envoyer
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 40, color: MUTED, textAlign: 'center' }}>
              Sélectionnez un ticket à gauche
            </div>
          )}
        </div>

        {selected && (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: 18, overflow: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#fff', fontSize: 16,
              }}>{selected.client.slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.client}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{selected.plan}</div>
              </div>
            </div>

            <SideRow icon={Mail} label="Email" value={selected.clientEmail} />
            <SideRow icon={Phone} label="Téléphone" value={selected.clientPhone} />
            <SideRow icon={Building2} label="Plan" value={selected.plan} />
            <SideRow icon={User} label="Assigné à" value={selected.assignee} />
            <SideRow icon={Clock} label="Créé" value={selected.created} />

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Actions rapides</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <button style={sideBtn}>Voir le client</button>
                <button style={sideBtn}>Impersonnifier</button>
                <button style={sideBtn}>Assigner à...</button>
                <button style={{ ...sideBtn, color: '#10b981', borderColor: '#10b98140' }}>Marquer résolu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket, active, onClick }: { ticket: Ticket; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: active ? 'rgba(167,139,250,0.08)' : 'transparent',
        border: 'none', borderBottom: `1px solid ${BORDER}`, borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
        padding: '12px 14px', cursor: 'pointer', color: TEXT,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: MUTED }}>{ticket.id}</span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{ticket.client}</div>
      <div style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ticket.subject}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: MUTED }}>
        <span>{ticket.assignee}</span>
        {ticket.sla !== '—' && (
          <span style={{ color: ticket.slaHot ? '#ef4444' : MUTED, fontWeight: 600 }}>
            SLA {ticket.sla}
          </span>
        )}
      </div>
    </button>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { c: string; l: string }> = {
    low: { c: '#64748b', l: 'Basse' },
    medium: { c: '#3b82f6', l: 'Moyenne' },
    high: { c: '#f59e0b', l: 'Haute' },
    urgent: { c: '#ef4444', l: 'Urgent' },
  };
  const p = map[priority];
  return (
    <span style={{
      background: `${p.c}26`, color: p.c, padding: '2px 8px',
      borderRadius: 4, fontSize: 10, fontWeight: 700,
    }}>{p.l}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Nouveau': '#f59e0b',
    'En cours': '#3b82f6',
    'Attente client': '#94a3b8',
    'Résolu': '#10b981',
  };
  const c = map[status] || MUTED;
  return (
    <span style={{
      background: `${c}26`, color: c, padding: '2px 8px',
      borderRadius: 4, fontSize: 10, fontWeight: 700,
    }}>{status}</span>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${color}20`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  );
}

function SideRow({ icon: Icon, label, value }: any) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', fontSize: 12, alignItems: 'center' }}>
      <Icon size={14} color={MUTED} />
      <div style={{ flex: 1 }}>
        <div style={{ color: MUTED, fontSize: 10 }}>{label}</div>
        <div style={{ color: TEXT }}>{value}</div>
      </div>
    </div>
  );
}

const sideBtn: React.CSSProperties = {
  background: BG, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
  fontSize: 12, fontWeight: 500, textAlign: 'left',
};
