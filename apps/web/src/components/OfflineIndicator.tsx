import { useEffect, useState } from 'react';

type Status = 'online' | 'offline' | 'syncing';

function OfflineIndicator() {
  const [status, setStatus] = useState<Status>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [visible, setVisible] = useState<boolean>(
    typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => {
      setStatus('syncing');
      setVisible(true);
      // Déclencher un event de synchronisation
      if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker.getRegistration() as any)) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && 'sync' in reg) {
            (reg as any).sync.register('creorga-sync').catch(() => { /* ignore */ });
          }
        });
      }
      setTimeout(() => {
        setStatus('online');
        setTimeout(() => setVisible(false), 2000);
      }, 1500);
    };

    const handleOffline = () => {
      setStatus('offline');
      setVisible(true);
    };

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        setStatus('online');
        setTimeout(() => setVisible(false), 2000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  if (!visible) return null;

  const colors: Record<Status, { bg: string; fg: string; icon: string; text: string }> = {
    offline: {
      bg: '#fef2f2',
      fg: '#991b1b',
      icon: '⚠️',
      text: 'Hors ligne - Les modifications seront synchronisées',
    },
    syncing: {
      bg: '#eef2ff',
      fg: '#3730a3',
      icon: '🔄',
      text: 'Synchronisation en cours…',
    },
    online: {
      bg: '#ecfdf5',
      fg: '#065f46',
      icon: '✅',
      text: 'Reconnecté - Données synchronisées',
    },
  };

  const c = colors[status];

  const style: React.CSSProperties = {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: c.bg,
    color: c.fg,
    padding: '10px 18px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 6px 20px rgba(15,23,42,0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 10000,
    maxWidth: 'calc(100vw - 24px)',
    animation: 'creorgaSlideDown 0.3s ease',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 16,
    animation: status === 'syncing' ? 'creorgaSpin 1s linear infinite' : undefined,
    display: 'inline-block',
  };

  return (
    <>
      <style>{`
        @keyframes creorgaSlideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes creorgaSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div role="status" aria-live="polite" style={style}>
        <span style={iconStyle}>{c.icon}</span>
        <span>{c.text}</span>
      </div>
    </>
  );
}

export default OfflineIndicator;
