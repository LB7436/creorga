import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type Moment = 'MORNING' | 'MIDDAY' | 'CLOSING';
type TaskStatus = 'Fait' | 'À faire' | 'En retard';
type Category = 'Nettoyage' | 'Température' | 'Réception' | 'Pest Control' | 'Formation' | 'Certifications';

interface HaccpTask {
  id: string;
  name: string;
  category: Category;
  frequency: Frequency;
  moment: Moment;
  assignee: string;
  duration: number; // minutes
  lastDone: string;
  nextDue: string;
  status: TaskStatus;
  rule: string;
}

const tasksData: HaccpTask[] = [
  { id: 't1', name: 'Nettoyage plan de travail cuisine', category: 'Nettoyage', frequency: 'DAILY', moment: 'MORNING', assignee: 'Paul M.', duration: 20, lastDone: 'Hier 08:10', nextDue: 'Aujourd\'hui 09:00', status: 'Fait', rule: 'Tous les jours à 09:00' },
  { id: 't2', name: 'Relevé températures frigos cuisine', category: 'Température', frequency: 'DAILY', moment: 'MORNING', assignee: 'Sophie L.', duration: 10, lastDone: 'Aujourd\'hui 08:32', nextDue: 'Aujourd\'hui 14:00', status: 'À faire', rule: '2× par jour (09h + 14h)' },
  { id: 't3', name: 'Relevé températures congélateurs', category: 'Température', frequency: 'DAILY', moment: 'CLOSING', assignee: 'Paul M.', duration: 8, lastDone: 'Hier 22:00', nextDue: 'Aujourd\'hui 22:00', status: 'À faire', rule: 'Chaque soir avant fermeture' },
  { id: 't4', name: 'Nettoyage salle client', category: 'Nettoyage', frequency: 'DAILY', moment: 'CLOSING', assignee: 'Julie K.', duration: 35, lastDone: 'Hier 23:15', nextDue: 'Aujourd\'hui 23:00', status: 'À faire', rule: 'Après chaque service' },
  { id: 't5', name: 'Nettoyage et désinfection toilettes', category: 'Nettoyage', frequency: 'DAILY', moment: 'MIDDAY', assignee: 'Julie K.', duration: 15, lastDone: 'Aujourd\'hui 12:45', nextDue: 'Aujourd\'hui 17:00', status: 'Fait', rule: '3× par jour' },
  { id: 't6', name: 'Contrôle réception marchandise fraîche', category: 'Réception', frequency: 'DAILY', moment: 'MORNING', assignee: 'Thomas B.', duration: 25, lastDone: 'Aujourd\'hui 07:15', nextDue: 'Demain 07:00', status: 'Fait', rule: 'À chaque livraison' },
  { id: 't7', name: 'Désinfection surfaces cuisine', category: 'Nettoyage', frequency: 'DAILY', moment: 'CLOSING', assignee: 'Paul M.', duration: 25, lastDone: 'Avant-hier 23:00', nextDue: 'Il y a 1 jour', status: 'En retard', rule: 'Chaque soir' },
  { id: 't8', name: 'Nettoyage hotte aspirante', category: 'Nettoyage', frequency: 'WEEKLY', moment: 'CLOSING', assignee: 'Paul M.', duration: 45, lastDone: 'Lundi 8 avr.', nextDue: 'Lundi 15 avr.', status: 'À faire', rule: 'Chaque lundi' },
  { id: 't9', name: 'Dégivrage chambre froide', category: 'Température', frequency: 'WEEKLY', moment: 'CLOSING', assignee: 'Thomas B.', duration: 90, lastDone: 'Dimanche 6 avr.', nextDue: 'Dimanche 13 avr.', status: 'À faire', rule: 'Chaque dimanche soir' },
  { id: 't10', name: 'Nettoyage approfondi sols cuisine', category: 'Nettoyage', frequency: 'WEEKLY', moment: 'CLOSING', assignee: 'Julie K.', duration: 40, lastDone: 'Samedi 5 avr.', nextDue: 'Samedi 12 avr.', status: 'À faire', rule: 'Chaque samedi' },
  { id: 't11', name: 'Inventaire produits chimiques', category: 'Nettoyage', frequency: 'WEEKLY', moment: 'MIDDAY', assignee: 'Sophie L.', duration: 20, lastDone: 'Mercredi 3 avr.', nextDue: 'Mercredi 17 avr.', status: 'Fait', rule: 'Chaque mercredi' },
  { id: 't12', name: 'Vérification pièges nuisibles', category: 'Pest Control', frequency: 'MONTHLY', moment: 'MORNING', assignee: 'Prestataire XT', duration: 60, lastDone: '15 mars 2026', nextDue: '15 avr. 2026', status: 'À faire', rule: 'Le 15 de chaque mois' },
  { id: 't13', name: 'Calibration thermomètres sondes', category: 'Température', frequency: 'MONTHLY', moment: 'MORNING', assignee: 'Thomas B.', duration: 30, lastDone: '1 mars 2026', nextDue: '1 avr. 2026', status: 'En retard', rule: 'Le 1er de chaque mois' },
  { id: 't14', name: 'Nettoyage conduits ventilation', category: 'Nettoyage', frequency: 'MONTHLY', moment: 'CLOSING', assignee: 'Prestataire AirClean', duration: 120, lastDone: '20 mars 2026', nextDue: '20 avr. 2026', status: 'À faire', rule: 'Le 20 de chaque mois' },
  { id: 't15', name: 'Audit traçabilité fournisseurs', category: 'Réception', frequency: 'MONTHLY', moment: 'MIDDAY', assignee: 'Sophie L.', duration: 45, lastDone: '28 mars 2026', nextDue: '28 avr. 2026', status: 'À faire', rule: 'Le 28 de chaque mois' },
  { id: 't16', name: 'Visite contrôle Pest Control', category: 'Pest Control', frequency: 'MONTHLY', moment: 'MORNING', assignee: 'Prestataire XT', duration: 90, lastDone: '15 mars 2026', nextDue: '15 avr. 2026', status: 'À faire', rule: 'Le 15 de chaque mois' },
  { id: 't17', name: 'Formation HACCP équipe cuisine', category: 'Formation', frequency: 'YEARLY', moment: 'MIDDAY', assignee: 'Responsable qualité', duration: 240, lastDone: '10 janv. 2026', nextDue: '10 janv. 2027', status: 'Fait', rule: 'Annuel — janvier' },
  { id: 't18', name: 'Renouvellement certificat HACCP', category: 'Certifications', frequency: 'YEARLY', moment: 'MORNING', assignee: 'Direction', duration: 180, lastDone: '5 juin 2025', nextDue: '5 juin 2026', status: 'À faire', rule: 'Annuel — juin' },
  { id: 't19', name: 'Contrôle sanitaire AFSCA', category: 'Certifications', frequency: 'YEARLY', moment: 'MORNING', assignee: 'Inspecteur AFSCA', duration: 180, lastDone: '12 sept. 2025', nextDue: '12 sept. 2026', status: 'À faire', rule: 'Annuel — inspection' },
  { id: 't20', name: 'Grand nettoyage annuel cuisine', category: 'Nettoyage', frequency: 'YEARLY', moment: 'CLOSING', assignee: 'Équipe complète', duration: 480, lastDone: '2 août 2025', nextDue: '2 août 2026', status: 'À faire', rule: 'Annuel — fermeture été' },
];

const freqLabels: Record<Frequency, string> = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdo',
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
};

const freqColors: Record<Frequency, { bg: string; color: string }> = {
  DAILY: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
  WEEKLY: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
  MONTHLY: { bg: 'rgba(139,92,246,0.1)', color: '#7c3aed' },
  YEARLY: { bg: 'rgba(236,72,153,0.1)', color: '#db2777' },
};

const momentLabels: Record<Moment, string> = {
  MORNING: 'Matin',
  MIDDAY: 'Midi',
  CLOSING: 'Soir',
};

const momentIcons: Record<Moment, string> = {
  MORNING: '🌅',
  MIDDAY: '☀',
  CLOSING: '🌙',
};

const categoryColors: Record<Category, string> = {
  Nettoyage: '#059669',
  Température: '#0284c7',
  Réception: '#d97706',
  'Pest Control': '#7c3aed',
  Formation: '#ec4899',
  Certifications: '#dc2626',
};

const categoryIcons: Record<Category, string> = {
  Nettoyage: '🧽',
  Température: '🌡',
  Réception: '📦',
  'Pest Control': '🐛',
  Formation: '🎓',
  Certifications: '📜',
};

const statusColors: Record<TaskStatus, { bg: string; color: string; border: string }> = {
  'Fait': { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.25)' },
  'À faire': { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.25)' },
  'En retard': { bg: 'rgba(239,68,68,0.12)', color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
};

const containerVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVar = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

type TabKey = 'Toutes' | 'Quotidiennes' | 'Hebdomadaires' | 'Mensuelles' | 'Annuelles';
type ViewMode = 'list' | 'calendar';

const assignees = ['Tous', 'Paul M.', 'Sophie L.', 'Julie K.', 'Thomas B.', 'Direction', 'Prestataire XT', 'Prestataire AirClean'];

export default function TachesPage() {
  const [tasks, setTasks] = useState<HaccpTask[]>(tasksData);
  const [tab, setTab] = useState<TabKey>('Toutes');
  const [view, setView] = useState<ViewMode>('list');
  const [filterAssignee, setFilterAssignee] = useState<string>('Tous');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'Tous'>('Tous');
  const [filterCategory, setFilterCategory] = useState<Category | 'Toutes'>('Toutes');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const freqMap: Record<TabKey, Frequency | 'ALL'> = {
    Toutes: 'ALL',
    Quotidiennes: 'DAILY',
    Hebdomadaires: 'WEEKLY',
    Mensuelles: 'MONTHLY',
    Annuelles: 'YEARLY',
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (freqMap[tab] !== 'ALL' && t.frequency !== freqMap[tab]) return false;
      if (filterAssignee !== 'Tous' && t.assignee !== filterAssignee) return false;
      if (filterStatus !== 'Tous' && t.status !== filterStatus) return false;
      if (filterCategory !== 'Toutes' && t.category !== filterCategory) return false;
      return true;
    });
  }, [tasks, tab, filterAssignee, filterStatus, filterCategory]);

  const stats = {
    active: tasks.length,
    doneToday: tasks.filter((t) => t.status === 'Fait').length,
    late: tasks.filter((t) => t.status === 'En retard').length,
  };

  const toggleDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: (t.status === 'Fait' ? 'À faire' : 'Fait') as TaskStatus,
              lastDone: t.status === 'Fait' ? t.lastDone : `Aujourd'hui ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — vous`,
            }
          : t
      )
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const markAllDone = () => {
    setTasks((prev) =>
      prev.map((t) =>
        selectedIds.includes(t.id) ? { ...t, status: 'Fait' as TaskStatus, lastDone: 'Aujourd\'hui (groupé)' } : t
      )
    );
    setSelectedIds([]);
  };

  const postponeAll = () => {
    setTasks((prev) =>
      prev.map((t) => (selectedIds.includes(t.id) ? { ...t, nextDue: 'Demain' } : t))
    );
    setSelectedIds([]);
  };

  /* Calendar grid (current month mock) */
  const today = 17;
  const daysInMonth = 30;
  const firstDayOffset = 2; // mock: month starts Wednesday

  const tasksByDay: Record<number, HaccpTask[]> = {};
  tasks.forEach((t) => {
    if (t.frequency === 'DAILY') {
      for (let d = 1; d <= daysInMonth; d++) {
        tasksByDay[d] = [...(tasksByDay[d] || []), t];
      }
    } else if (t.frequency === 'WEEKLY') {
      for (let d = 1; d <= daysInMonth; d += 7) {
        tasksByDay[d] = [...(tasksByDay[d] || []), t];
      }
    } else if (t.frequency === 'MONTHLY') {
      const day = parseInt(t.nextDue.split(' ')[0]) || 15;
      tasksByDay[day] = [...(tasksByDay[day] || []), t];
    }
  });

  return (
    <motion.div
      variants={containerVar}
      initial="hidden"
      animate="show"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      {/* Header */}
      <motion.div variants={itemVar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Tâches HACCP récurrentes</h1>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 15 }}>
            Gestion des nettoyages, contrôles température et conformité sanitaire
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, border: '1px solid #e2e8f0' }}>
            {(['list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 9,
                  background: view === v ? '#ffffff' : 'transparent',
                  color: view === v ? '#1e293b' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {v === 'list' ? '☰ Liste' : '🗓 Calendrier'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              background: '#B45309',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '11px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(180,83,9,0.2)',
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> Ajouter une tâche
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVar} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Tâches actives', value: stats.active, sub: 'Programmées actuellement', color: '#6366f1', icon: '📋' },
          { label: 'Complétées aujourd\'hui', value: stats.doneToday, sub: 'Sur ' + stats.active + ' tâches du jour', color: '#10b981', icon: '✅' },
          { label: 'En retard', value: stats.late, sub: stats.late > 0 ? 'Action requise' : 'Tout est à jour', color: stats.late > 0 ? '#ef4444' : '#94a3b8', icon: '⚠' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08 }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              padding: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: `${s.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVar} style={{ display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
        {(['Toutes', 'Quotidiennes', 'Hebdomadaires', 'Mensuelles', 'Annuelles'] as TabKey[]).map((t) => {
          const count = t === 'Toutes' ? tasks.length : tasks.filter((x) => x.frequency === freqMap[t]).length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '11px 18px',
                fontSize: 14,
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? '#B45309' : 'transparent'}`,
                color: active ? '#B45309' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: -1,
              }}
            >
              {t}
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 10,
                  background: active ? 'rgba(180,83,9,0.1)' : '#f1f5f9',
                  color: active ? '#B45309' : '#94a3b8',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Filters + bulk actions */}
      <motion.div variants={itemVar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            style={{
              padding: '9px 14px',
              fontSize: 13,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              color: '#1e293b',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {assignees.map((a) => (
              <option key={a}>{a === 'Tous' ? 'Tous les responsables' : a}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'Tous')}
            style={{
              padding: '9px 14px',
              fontSize: 13,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              color: '#1e293b',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="Tous">Tous les statuts</option>
            <option value="Fait">Fait</option>
            <option value="À faire">À faire</option>
            <option value="En retard">En retard</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as Category | 'Toutes')}
            style={{
              padding: '9px 14px',
              fontSize: 13,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              color: '#1e293b',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="Toutes">Toutes les catégories</option>
            {(Object.keys(categoryColors) as Category[]).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                background: 'rgba(180,83,9,0.08)',
                border: '1px solid rgba(180,83,9,0.2)',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                {selectedIds.length} sélectionnée{selectedIds.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={markAllDone}
                style={{
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9,
                  cursor: 'pointer',
                }}
              >
                ✓ Tout marquer fait
              </button>
              <button
                onClick={postponeAll}
                style={{
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#92400e',
                  border: '1px solid rgba(180,83,9,0.3)',
                  borderRadius: 9,
                  cursor: 'pointer',
                }}
              >
                → Reporter à demain
              </button>
              <button
                onClick={() => setSelectedIds([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#92400e',
                  fontSize: 16,
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: 4,
                }}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content: list or calendar */}
      {view === 'list' ? (
        <motion.div
          variants={itemVar}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((t) => t.id))}
                      style={{ cursor: 'pointer', accentColor: '#B45309' }}
                    />
                  </th>
                  {['Tâche', 'Catégorie', 'Fréquence', 'Moment', 'Responsable', 'Durée', 'Dernière', 'Prochaine', 'Statut', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                      Aucune tâche ne correspond aux filtres.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t, i) => (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: selectedIds.includes(t.id) ? 'rgba(180,83,9,0.03)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          style={{ cursor: 'pointer', accentColor: '#B45309' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{t.name}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{t.rule}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 9,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${categoryColors[t.category]}14`,
                            color: categoryColors[t.category],
                          }}
                        >
                          <span>{categoryIcons[t.category]}</span>
                          {t.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 8,
                            background: freqColors[t.frequency].bg,
                            color: freqColors[t.frequency].color,
                          }}
                        >
                          {freqLabels[t.frequency]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        <span style={{ marginRight: 5 }}>{momentIcons[t.moment]}</span>
                        {momentLabels[t.moment]}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{t.assignee}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                        {t.duration >= 60 ? `${Math.floor(t.duration / 60)}h${t.duration % 60 ? ' ' + (t.duration % 60) + 'min' : ''}` : `${t.duration} min`}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: '#64748b' }}>{t.lastDone}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: t.status === 'En retard' ? '#dc2626' : '#475569', fontWeight: t.status === 'En retard' ? 600 : 400 }}>
                        {t.nextDue}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 9,
                            background: statusColors[t.status].bg,
                            color: statusColors[t.status].color,
                            border: `1px solid ${statusColors[t.status].border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => toggleDone(t.id)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            border: `2px solid ${t.status === 'Fait' ? '#10b981' : '#cbd5e1'}`,
                            background: t.status === 'Fait' ? '#10b981' : '#ffffff',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 15,
                            fontWeight: 700,
                            transition: 'all 0.15s',
                          }}
                          title={t.status === 'Fait' ? 'Annuler' : 'Marquer fait'}
                        >
                          {t.status === 'Fait' ? '✓' : ''}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        /* Calendar view */
        <motion.div
          variants={itemVar}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 18,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', margin: 0 }}>Avril 2026</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#64748b' }}>←</button>
              <button style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#64748b' }}>→</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 10 }}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textAlign: 'center', padding: '6px 0' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {Array.from({ length: firstDayOffset }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayTasks = tasksByDay[day] || [];
              const isToday = day === today;
              return (
                <div
                  key={day}
                  style={{
                    minHeight: 88,
                    padding: 8,
                    background: isToday ? 'rgba(180,83,9,0.06)' : '#fafbfc',
                    border: `1px solid ${isToday ? 'rgba(180,83,9,0.3)' : '#e2e8f0'}`,
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 600,
                      color: isToday ? '#B45309' : '#1e293b',
                      marginBottom: 2,
                    }}
                  >
                    {day}
                  </div>
                  {dayTasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 5,
                        background: `${categoryColors[t.category]}18`,
                        color: categoryColors[t.category],
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={t.name}
                    >
                      {t.name}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>
                      +{dayTasks.length - 3} autres
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════
          Add task modal
          ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                width: 620,
                maxWidth: '100%',
                padding: 28,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Nouvelle tâche HACCP</h2>
                <button
                  onClick={() => setAddOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b' }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Nom de la tâche
                  </label>
                  <input
                    placeholder="Ex : Nettoyage friteuse"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: 14,
                      background: '#fafbfc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 11,
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Catégorie
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 11,
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    >
                      {(Object.keys(categoryColors) as Category[]).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Responsable
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 11,
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    >
                      {assignees.filter((a) => a !== 'Tous').map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Fréquence
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 11,
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    >
                      <option value="DAILY">Quotidien</option>
                      <option value="WEEKLY">Hebdo</option>
                      <option value="MONTHLY">Mensuel</option>
                      <option value="YEARLY">Annuel</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Moment
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 11,
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    >
                      <option value="MORNING">Matin</option>
                      <option value="MIDDAY">Midi</option>
                      <option value="CLOSING">Soir</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Durée (min)
                    </label>
                    <input
                      type="number"
                      defaultValue={15}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 11,
                        color: '#1e293b',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Règle de récurrence
                  </label>
                  <input
                    placeholder="Ex : Tous les jours à 09:00, Chaque lundi"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: 14,
                      background: '#fafbfc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 11,
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {['Tous les jours à 09:00', 'Chaque lundi', 'Le 1er du mois', 'Après chaque service'].map((s) => (
                      <button
                        key={s}
                        style={{
                          padding: '5px 10px',
                          fontSize: 11.5,
                          fontWeight: 500,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Consignes / Notes
                  </label>
                  <textarea
                    placeholder="Détails de la procédure à suivre..."
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: '11px 14px',
                      fontSize: 13.5,
                      background: '#fafbfc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 11,
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                <button
                  onClick={() => setAddOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 11,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => setAddOpen(false)}
                  style={{
                    background: '#B45309',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 11,
                    padding: '10px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Créer la tâche
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
