import { useEffect, useRef, useState, type ReactNode } from 'react';

type BottomNavItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
};

const BOTTOM_NAV: BottomNavItem[] = [
  { key: 'dashboard', label: 'Accueil', icon: '🏠', href: '/' },
  { key: 'pos', label: 'POS', icon: '🧾', href: '/pos/dashboard' },
  { key: 'agenda', label: 'Agenda', icon: '📅', href: '/agenda' },
  { key: 'clients', label: 'Clients', icon: '👥', href: '/clients' },
  { key: 'plus', label: 'Plus', icon: '⋯', href: '/menu' },
];

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const small = window.innerWidth <= 768;
  return mobileRegex.test(ua) || (touch && small);
}

type Props = {
  children: ReactNode;
  activeKey?: string;
  onNavigate?: (href: string) => void;
};

function MobileOptimized({ children, activeKey, onNavigate }: Props) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [pullProgress, setPullProgress] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchTime = useRef<number>(0);

  useEffect(() => {
    const update = () => setIsMobile(detectMobile());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Masquer la barre latérale sur mobile via data-attribute + class hook
  useEffect(() => {
    if (isMobile) {
      document.body.setAttribute('data-mobile', 'true');
      document.body.classList.add('is-mobile');
    } else {
      document.body.removeAttribute('data-mobile');
      document.body.classList.remove('is-mobile');
    }
    return () => {
      document.body.removeAttribute('data-mobile');
      document.body.classList.remove('is-mobile');
    };
  }, [isMobile]);

  // Gestes de swipe (retour/avance) + pull-to-refresh
  useEffect(() => {
    if (!isMobile) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
      touchTime.current = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dy = t.clientY - touchStartY.current;
      if (window.scrollY <= 0 && dy > 0) {
        const progress = Math.min(dy / 120, 1);
        setPullProgress(progress);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX.current;
      const dy = t.clientY - touchStartY.current;
      const dt = Date.now() - touchTime.current;

      // Pull-to-refresh
      if (window.scrollY <= 0 && dy > 100 && Math.abs(dx) < 60) {
        setRefreshing(true);
        setPullProgress(1);
        setTimeout(() => {
          window.location.reload();
        }, 300);
        return;
      }
      setPullProgress(0);

      // Swipe horizontal : retour/avance
      if (dt < 500 && Math.abs(dx) > 100 && Math.abs(dy) < 80) {
        if (dx > 0 && touchStartX.current < 30) {
          window.history.back();
        } else if (dx < 0 && touchStartX.current > window.innerWidth - 30) {
          window.history.forward();
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile]);

  const handleNav = (href: string) => {
    if (onNavigate) onNavigate(href);
    else window.location.href = href;
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  const wrapperStyle: React.CSSProperties = {
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
    minHeight: '100vh',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'pan-y',
  };

  const pullIndicatorStyle: React.CSSProperties = {
    position: 'fixed',
    top: 'env(safe-area-inset-top, 0px)',
    left: 0,
    right: 0,
    height: `${pullProgress * 60}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366f1',
    fontSize: 14,
    fontWeight: 600,
    background: 'linear-gradient(180deg, rgba(99,102,241,0.08), transparent)',
    transition: refreshing ? 'none' : 'height 0.2s ease',
    zIndex: 9998,
    pointerEvents: 'none',
  };

  const bottomNavStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    boxShadow: '0 -2px 12px rgba(15, 23, 42, 0.06)',
    zIndex: 9999,
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 56,
    minWidth: 44,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '8px 4px',
    fontSize: 11,
    fontWeight: 600,
    color: active ? '#6366f1' : '#64748b',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  });

  return (
    <div style={wrapperStyle}>
      {pullProgress > 0 && (
        <div style={pullIndicatorStyle}>
          {refreshing ? 'Actualisation…' : pullProgress >= 1 ? 'Relâcher pour actualiser' : 'Tirer pour actualiser'}
        </div>
      )}
      <main>{children}</main>
      <nav style={bottomNavStyle} aria-label="Navigation principale">
        {BOTTOM_NAV.map((item) => {
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.href)}
              style={itemStyle(active)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default MobileOptimized;
