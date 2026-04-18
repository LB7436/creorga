interface Props {
  status: 'Actif' | 'Trial' | 'Suspendu' | 'Churned' | string;
  size?: 'sm' | 'md';
}

const COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  Actif: { bg: 'rgba(34, 197, 94, 0.15)', fg: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  Trial: { bg: 'rgba(167, 139, 250, 0.15)', fg: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },
  Suspendu: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  Churned: { bg: 'rgba(239, 68, 68, 0.15)', fg: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  Starter: { bg: 'rgba(100, 116, 139, 0.15)', fg: '#cbd5e1', border: 'rgba(100, 116, 139, 0.3)' },
  Pro: { bg: 'rgba(59, 130, 246, 0.15)', fg: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  Business: { bg: 'rgba(167, 139, 250, 0.15)', fg: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },
  Enterprise: { bg: 'rgba(236, 72, 153, 0.15)', fg: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
};

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const c = COLORS[status] || COLORS.Actif;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '3px 10px' : '5px 14px',
      borderRadius: 999,
      background: c.bg, color: c.fg,
      border: `1px solid ${c.border}`,
      fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600, letterSpacing: 0.3,
    }}>
      {status}
    </span>
  );
}
