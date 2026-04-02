import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

export default function Welcome() {
  const navigate = useNavigate()
  const company = useAuthStore((s) => s.company)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const timer = setTimeout(() => navigate('/modules', { replace: true }), 3200)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #111827 100%)' }}
    >
      {/* Ambient orbs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
          top: '30%',
          right: '15%',
        }}
        animate={{ scale: [1.1, 0.9, 1.1], x: [20, -20, 20] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)',
          bottom: '20%',
          left: '10%',
        }}
        animate={{ scale: [0.9, 1.2, 0.9] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mb-10"
      >
        <div
          className="w-20 h-20 rounded-[22px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(37,99,235,0.35)',
          }}
        >
          <span className="text-white text-3xl font-bold tracking-tight">C</span>
        </div>
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-[22px]"
          style={{ border: '1px solid rgba(37,99,235,0.5)' }}
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Text */}
      <div className="text-center relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-blue-400/70 text-sm font-medium tracking-[0.2em] uppercase mb-3"
        >
          Bienvenue chez
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
          className="text-white font-bold tracking-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          {company?.name ?? 'Creorga'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="text-gray-500 mt-3 text-sm"
        >
          Bonjour{user?.firstName ? `, ${user.firstName}` : ''} — chargement de votre espace…
        </motion.p>
      </div>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-600 via-blue-400 to-transparent"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 3.2, ease: 'linear' }}
      />
    </div>
  )
}
