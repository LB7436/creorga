import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts';
import {
  Thermometer, AlertTriangle, CheckCircle2, Plus, X, Download, Mail, Camera,
  Clock, Filter, FileText, Bell, Snowflake, Refrigerator, Package,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EquipmentIcon = 'fridge' | 'freezer' | 'coldroom' | 'drinks';

interface Equipment {
  id: string;
  name: string;
  icon: EquipmentIcon;
  min: number;
  max: number;
  current: number;
  lastReading: string;
  sparkline: number[];
}

interface Reading {
  id: string;
  equipmentId: string;
  equipmentName: string;
  value: number;
  timestamp: string;
  user: string;
  conform: boolean;
  notes?: string;
  auto?: boolean;
}

interface Alert {
  id: string;
  equipment: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  since: string;
  duration: string;
  acknowledged: boolean;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const equipments: Equipment[] = [
  {
    id: 'eq1', name: 'Frigo Cuisine', icon: 'fridge', min: 2, max: 8, current: 4.5,
    lastReading: 'Il y a 12 min',
    sparkline: [4.2, 4.4, 4.6, 4.8, 5.1, 4.9, 4.7, 4.5, 4.3, 4.4, 4.5, 4.6, 4.5, 4.4, 4.3, 4.5, 4.6, 4.8, 4.7, 4.5, 4.4, 4.3, 4.5, 4.5],
  },
  {
    id: 'eq2', name: 'Congélateur', icon: 'freezer', min: -25, max: -18, current: -21,
    lastReading: 'Il y a 18 min',
    sparkline: [-21.2, -21.0, -20.8, -20.5, -20.7, -21.1, -21.3, -21.5, -21.4, -21.2, -21.0, -20.9, -21.1, -21.3, -21.2, -21.0, -20.8, -20.9, -21.1, -21.2, -21.0, -20.9, -21.1, -21.0],
  },
  {
    id: 'eq3', name: 'Frigo Boissons', icon: 'drinks', min: 2, max: 8, current: 9.2,
    lastReading: 'Il y a 8 min',
    sparkline: [6.5, 6.8, 7.1, 7.4, 7.8, 8.1, 8.3, 8.5, 8.7, 8.9, 9.0, 9.1, 9.3, 9.4, 9.2, 9.1, 9.0, 9.1, 9.2, 9.3, 9.1, 9.0, 9.1, 9.2],
  },
  {
    id: 'eq4', name: 'Chambre froide viandes', icon: 'coldroom', min: 0, max: 4, current: 2.5,
    lastReading: 'Il y a 22 min',
    sparkline: [2.3, 2.4, 2.5, 2.6, 2.7, 2.5, 2.4, 2.3, 2.5, 2.6, 2.7, 2.8, 2.6, 2.5, 2.4, 2.3, 2.5, 2.6, 2.7, 2.5, 2.4, 2.3, 2.4, 2.5],
  },
];

const chart24h = Array.from({ length: 24 }, (_, i) => ({
  heure: `${String(i).padStart(2, '0')}h`,
  frigoC: equipments[0].sparkline[i],
  congel: equipments[1].sparkline[i],
  frigoB: equipments[2].sparkline[i],
  chambre: equipments[3].sparkline[i],
}));

const historyMock: Reading[] = [
  { id: 'r1', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.5, timestamp: '17/04 14:32', user: 'Sophie L.', conform: true, auto: false },
  { id: 'r2', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -21, timestamp: '17/04 14:30', user: 'Sophie L.', conform: true, auto: false },
  { id: 'r3', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 9.2, timestamp: '17/04 14:28', user: 'Auto', conform: false, auto: true, notes: 'Hors norme — alerte déclenchée' },
  { id: 'r4', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.5, timestamp: '17/04 14:15', user: 'Paul M.', conform: true, auto: false },
  { id: 'r5', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.3, timestamp: '17/04 12:00', user: 'Auto', conform: true, auto: true },
  { id: 'r6', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -20.8, timestamp: '17/04 12:00', user: 'Auto', conform: true, auto: true },
  { id: 'r7', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 8.7, timestamp: '17/04 12:00', user: 'Auto', conform: false, auto: true },
  { id: 'r8', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.4, timestamp: '17/04 12:00', user: 'Auto', conform: true, auto: true },
  { id: 'r9', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.1, timestamp: '17/04 09:00', user: 'Thomas B.', conform: true, auto: false },
  { id: 'r10', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -21.5, timestamp: '17/04 09:00', user: 'Thomas B.', conform: true, auto: false },
  { id: 'r11', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 7.2, timestamp: '17/04 09:00', user: 'Thomas B.', conform: true, auto: false },
  { id: 'r12', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.2, timestamp: '17/04 09:00', user: 'Thomas B.', conform: true, auto: false },
  { id: 'r13', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.8, timestamp: '17/04 06:00', user: 'Auto', conform: true, auto: true },
  { id: 'r14', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -20.5, timestamp: '17/04 06:00', user: 'Auto', conform: true, auto: true },
  { id: 'r15', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 7.5, timestamp: '17/04 06:00', user: 'Auto', conform: true, auto: true },
  { id: 'r16', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.6, timestamp: '17/04 06:00', user: 'Auto', conform: true, auto: true },
  { id: 'r17', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 5.1, timestamp: '16/04 22:00', user: 'Julie K.', conform: true, auto: false },
  { id: 'r18', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -20.7, timestamp: '16/04 22:00', user: 'Julie K.', conform: true, auto: false },
  { id: 'r19', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 7.8, timestamp: '16/04 22:00', user: 'Julie K.', conform: true, auto: false },
  { id: 'r20', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.7, timestamp: '16/04 22:00', user: 'Julie K.', conform: true, auto: false },
  { id: 'r21', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.9, timestamp: '16/04 18:00', user: 'Auto', conform: true, auto: true },
  { id: 'r22', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -21.1, timestamp: '16/04 18:00', user: 'Auto', conform: true, auto: true },
  { id: 'r23', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 8.1, timestamp: '16/04 18:00', user: 'Auto', conform: false, auto: true },
  { id: 'r24', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.5, timestamp: '16/04 18:00', user: 'Auto', conform: true, auto: true },
  { id: 'r25', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.7, timestamp: '16/04 12:00', user: 'Sophie L.', conform: true, auto: false },
  { id: 'r26', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -21.3, timestamp: '16/04 12:00', user: 'Sophie L.', conform: true, auto: false },
  { id: 'r27', equipmentId: 'eq3', equipmentName: 'Frigo Boissons', value: 8.3, timestamp: '16/04 12:00', user: 'Sophie L.', conform: false, auto: false, notes: 'Porte restée ouverte' },
  { id: 'r28', equipmentId: 'eq4', equipmentName: 'Chambre froide viandes', value: 2.3, timestamp: '16/04 12:00', user: 'Sophie L.', conform: true, auto: false },
  { id: 'r29', equipmentId: 'eq1', equipmentName: 'Frigo Cuisine', value: 4.4, timestamp: '16/04 09:00', user: 'Thomas B.', conform: true, auto: false },
  { id: 'r30', equipmentId: 'eq2', equipmentName: 'Congélateur', value: -21.0, timestamp: '16/04 09:00', user: 'Thomas B.', conform: true, auto: false },
];

const alertsMock: Alert[] = [
  {
    id: 'a1', equipment: 'Frigo Boissons', severity: 'high',
    message: 'Température au-dessus de la limite (9,2°C > 8°C)',
    since: '17/04 13:15', duration: '1h 17min', acknowledged: false,
  },
];

const scheduledChecks = [
  { time: '06:00', label: 'Contrôle matin', done: true, missed: false },
  { time: '12:00', label: 'Contrôle midi', done: true, missed: false },
  { time: '18:00', label: 'Contrôle après-midi', done: false, missed: false },
  { time: '22:00', label: 'Contrôle soir', done: false, missed: false },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const iconMap: Record<EquipmentIcon, typeof Refrigerator> = {
  fridge: Refrigerator,
  freezer: Snowflake,
  coldroom: Package,
  drinks: Refrigerator,
};

const isConform = (eq: Equipment) => eq.current >= eq.min && eq.current <= eq.max;

const Sparkline = ({ values, conform }: { values: number[]; conform: boolean }) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
      <polyline
        points={points}
        fill="none"
        stroke={conform ? '#10b981' : '#ef4444'}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TemperaturesPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(equipments[0].id);
  const [valueInput, setValueInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterConform, setFilterConform] = useState<string>('all');

  const selectedEq = equipments.find(e => e.id === selectedEquipmentId)!;
  const inputNum = parseFloat(valueInput);
  const inputConform = !isNaN(inputNum) && inputNum >= selectedEq.min && inputNum <= selectedEq.max;

  const filteredHistory = useMemo(() => {
    return historyMock.filter(r => {
      if (filterEquipment !== 'all' && r.equipmentId !== filterEquipment) return false;
      if (filterConform === 'ok' && !r.conform) return false;
      if (filterConform === 'ko' && r.conform) return false;
      if (filterDate === 'today' && !r.timestamp.startsWith('17/04')) return false;
      if (filterDate === 'yesterday' && !r.timestamp.startsWith('16/04')) return false;
      return true;
    });
  }, [filterEquipment, filterDate, filterConform]);

  const stats = {
    equipements: equipments.length,
    mesuresToday: historyMock.filter(r => r.timestamp.startsWith('17/04')).length,
    alertes: alertsMock.filter(a => !a.acknowledged).length,
    conformite: 98,
  };

  const saveReading = () => {
    setShowModal(false);
    setValueInput('');
    setNotes('');
  };

  const exportCsv = () => {
    const rows = [
      ['N°', 'Équipement', 'Valeur', 'Date', 'Opérateur', 'Conforme', 'Notes'],
      ...historyMock.map(r => [r.id, r.equipmentName, String(r.value), r.timestamp, r.user, r.conform ? 'Oui' : 'Non', r.notes ?? '']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'temperatures.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Températures</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            Suivi des équipements frigorifiques — conformité HACCP
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={exportCsv} style={btnGhost}>
            <Download size={16} /> Export CSV
          </button>
          <button style={btnGhost}>
            <Mail size={16} /> Envoyer HACCP
          </button>
          <button onClick={() => setShowModal(true)} style={btnPrimary}>
            <Plus size={16} /> Enregistrer une température
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard label="Équipements" value={String(stats.equipements)} icon={<Thermometer size={18} />} accent="#0369a1" />
        <StatCard label="Mesures aujourd'hui" value={String(stats.mesuresToday)} icon={<FileText size={18} />} accent="#10b981" />
        <StatCard label="Alertes actives" value={String(stats.alertes)} icon={<AlertTriangle size={18} />} accent="#ef4444" />
        <StatCard label="Conformité 7j" value={`${stats.conformite}%`} icon={<CheckCircle2 size={18} />} accent="#059669" />
      </div>

      {/* Scheduled checks */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={h2Style}><Clock size={18} /> Contrôles planifiés — Aujourd'hui</h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>Auto-déclenchés 4× par jour</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {scheduledChecks.map(c => (
            <div
              key={c.time}
              style={{
                padding: '14px 16px',
                background: c.missed ? '#fef2f2' : c.done ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${c.missed ? '#fecaca' : c.done ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Clock size={14} color={c.missed ? '#dc2626' : c.done ? '#059669' : '#64748b'} />
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.missed ? '#dc2626' : c.done ? '#059669' : '#64748b' }}>
                {c.missed ? 'Manqué' : c.done ? '✓ Effectué' : '⏰ En attente'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
        {equipments.map((eq, i) => {
          const conform = isConform(eq);
          const Icon = iconMap[eq.icon];
          return (
            <motion.div
              key={eq.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: '#fff',
                border: `1px solid ${conform ? '#e2e8f0' : '#fecaca'}`,
                borderLeft: `4px solid ${conform ? '#10b981' : '#ef4444'}`,
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: conform ? '#ecfdf5' : '#fef2f2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: conform ? '#059669' : '#dc2626',
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{eq.name}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 12, fontWeight: 700,
                  background: conform ? '#ecfdf5' : '#fef2f2',
                  color: conform ? '#059669' : '#dc2626',
                  letterSpacing: 0.3,
                }}>
                  {conform ? 'OK' : 'HORS NORME'}
                </span>
              </div>

              <div style={{ fontSize: 36, fontWeight: 700, color: conform ? '#1e293b' : '#dc2626', lineHeight: 1 }}>
                {eq.current}°C
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Cible : {eq.min} à {eq.max}°C
              </div>

              <div style={{ marginTop: 12 }}>
                <Sparkline values={eq.sparkline} conform={conform} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                <Clock size={11} />
                {eq.lastReading}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 24h chart */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={h2Style}>Courbes 24h — toutes équipements</h2>
        <div style={{ width: '100%', height: 320, marginTop: 12 }}>
          <ResponsiveContainer>
            <LineChart data={chart24h}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="heure" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceArea y1={2} y2={8} fill="#bbf7d0" fillOpacity={0.18} />
              <ReferenceArea y1={-25} y2={-18} fill="#bfdbfe" fillOpacity={0.18} />
              <ReferenceArea y1={0} y2={4} fill="#ddd6fe" fillOpacity={0.15} />
              <Line type="monotone" dataKey="frigoC" name="Frigo Cuisine" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="congel" name="Congélateur" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="frigoB" name="Frigo Boissons" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="chambre" name="Chambre froide" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={h2Style}><Bell size={18} /> Alertes actives</h2>
        <div style={{ marginTop: 12 }}>
          {alertsMock.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Aucune alerte active.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alertsMock.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: a.severity === 'high' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${a.severity === 'high' ? '#fecaca' : '#fde68a'}`,
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={20} color={a.severity === 'high' ? '#dc2626' : '#d97706'} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{a.equipment}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.message}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Depuis {a.since} — durée : {a.duration}
                      </div>
                    </div>
                  </div>
                  <button style={{ ...btnGhost, fontSize: 12 }}>
                    {a.acknowledged ? 'Acquitté' : 'Acquitter'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={h2Style}><FileText size={18} /> Historique (30 dernières mesures)</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={14} color="#64748b" />
            <select value={filterEquipment} onChange={e => setFilterEquipment(e.target.value)} style={selectStyle}>
              <option value="all">Tous équipements</option>
              {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={selectStyle}>
              <option value="all">Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="yesterday">Hier</option>
            </select>
            <select value={filterConform} onChange={e => setFilterConform(e.target.value)} style={selectStyle}>
              <option value="all">Toutes conformités</option>
              <option value="ok">Conformes</option>
              <option value="ko">Non conformes</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Équipement</th>
                <th style={thStyle}>Valeur</th>
                <th style={thStyle}>Date/Heure</th>
                <th style={thStyle}>Opérateur</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Conformité</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{r.equipmentName}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: r.conform ? '#1e293b' : '#dc2626' }}>{r.value}°C</td>
                  <td style={tdStyle}>{r.timestamp}</td>
                  <td style={tdStyle}>{r.user}</td>
                  <td style={tdStyle}>
                    {r.auto ? (
                      <span style={{ fontSize: 11, color: '#6366f1', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> Auto
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#64748b' }}>Manuel</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      background: r.conform ? '#ecfdf5' : '#fef2f2',
                      color: r.conform ? '#059669' : '#dc2626',
                    }}>
                      {r.conform ? 'Conforme' : 'Non conforme'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
                padding: 28, boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: 18 }}>Enregistrer une température</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Équipement</label>
                  <select value={selectedEquipmentId} onChange={e => setSelectedEquipmentId(e.target.value)} style={inputStyle}>
                    {equipments.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.min} à {e.max}°C)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Valeur mesurée</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={valueInput}
                      onChange={e => setValueInput(e.target.value)}
                      placeholder="Ex: 4.5"
                      style={{ ...inputStyle, paddingRight: 40 }}
                    />
                    <span style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      color: '#64748b', fontSize: 13, fontWeight: 600,
                    }}>°C</span>
                  </div>
                  {!isNaN(inputNum) && (
                    <div style={{
                      marginTop: 6, fontSize: 12, fontWeight: 600,
                      color: inputConform ? '#059669' : '#dc2626',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {inputConform ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {inputConform ? 'Conforme aux cibles' : 'HORS NORME — alerte sera déclenchée'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Photo (optionnel)</label>
                  <button
                    type="button"
                    style={{
                      ...inputStyle,
                      display: 'flex', alignItems: 'center', gap: 8, color: '#64748b',
                      cursor: 'pointer', textAlign: 'left' as const,
                    }}
                  >
                    <Camera size={16} /> Ajouter une preuve photo
                  </button>
                </div>

                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observations éventuelles..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Horodatage automatique : {new Date().toLocaleString('fr-FR')}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button onClick={() => setShowModal(false)} style={btnGhost}>Annuler</button>
                  <button
                    onClick={saveReading}
                    style={{ ...btnPrimary, opacity: valueInput ? 1 : 0.5, cursor: valueInput ? 'pointer' : 'not-allowed' }}
                    disabled={!valueInput}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components & styles                                            */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22,
};

const h2Style: React.CSSProperties = {
  margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b',
  display: 'flex', alignItems: 'center', gap: 8,
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', border: 'none', borderRadius: 8,
  background: '#B45309', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
  background: '#fff', color: '#334155', fontWeight: 500, fontSize: 13, cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box' as const,
};

const selectStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
  fontSize: 12, color: '#334155', background: '#fff', cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left' as const, padding: '10px 12px', fontWeight: 600, color: '#475569',
  fontSize: 12, borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', color: '#1e293b',
};
