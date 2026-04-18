import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';

type Props = {
  to?: string;
  href?: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  icon?: boolean;
  onClick?: () => void;
};

export default function CTAButton({
  to,
  href,
  children,
  variant = 'primary',
  size = 'md',
  icon = true,
  onClick,
}: Props) {
  const padding = size === 'lg' ? '16px 32px' : '12px 24px';
  const fontSize = size === 'lg' ? 17 : 15;

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      color: '#fff',
      boxShadow: '0 10px 30px -10px rgba(99,102,241,0.6)',
    },
    secondary: {
      background: '#fff',
      color: '#0f172a',
      border: '1px solid #e2e8f0',
    },
    ghost: {
      background: 'transparent',
      color: '#6366f1',
      border: '1px solid rgba(99,102,241,0.3)',
    },
  };

  const content = (
    <motion.span
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: 12,
        transition: 'all 0.2s',
        ...styles[variant],
      }}
    >
      {children}
      {icon && <ArrowRight size={size === 'lg' ? 18 : 16} />}
    </motion.span>
  );

  if (to) return <Link to={to}>{content}</Link>;
  if (href) return <a href={href}>{content}</a>;
  return <button onClick={onClick}>{content}</button>;
}
