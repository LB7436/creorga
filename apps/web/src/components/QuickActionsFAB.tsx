import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Bot, Boxes, Receipt, Users, CalendarDays, Camera, Megaphone, PackageSearch } from 'lucide-react'
import { useModuleStore } from '@/stores/moduleStore'
import { useAssistant } from '@/stores/assistantStore'

type Action = {
  label: string
  icon: React.ReactNode
  run: () => void
}

export default function QuickActionsFAB() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const activeModule = useModuleStore((s) => s.activeModule)
  const assistant = useAssistant()

  const actions = useMemo<Action[]>(() => {
    const path = location.pathname
    const askAgent = async (text: string) => {
      await fetch('/api/agent/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).catch(() => undefined)
    }

    if (path.startsWith('/pos') || activeModule === 'pos') {
      return [
        { label: 'Nouvelle commande', icon: <Receipt size={16} />, run: () => navigate('/pos/floor') },
        { label: 'Encaisser table', icon: <Plus size={16} />, run: () => navigate('/pos/floor?checkout=1') },
        { label: 'Stock cafe', icon: <Boxes size={16} />, run: () => navigate('/inventory/stock?filter=cafe') },
      ]
    }
    if (path.startsWith('/hr') || activeModule === 'hr') {
      return [
        { label: 'Pointer entree', icon: <Plus size={16} />, run: () => askAgent('je commence') },
        { label: 'Qui travaille', icon: <Users size={16} />, run: () => navigate('/hr/planning') },
        { label: 'Nouveau conge', icon: <CalendarDays size={16} />, run: () => navigate('/hr/conges') },
      ]
    }
    if (path.startsWith('/inventory') || activeModule === 'inventory') {
      return [
        { label: 'Scanner ticket', icon: <Camera size={16} />, run: () => navigate('/m/camera') },
        { label: 'Stock bas', icon: <PackageSearch size={16} />, run: () => navigate('/inventory/stock?filter=low') },
        { label: 'Commander Metro', icon: <Boxes size={16} />, run: () => navigate('/inventory/commandes?supplier=metro') },
      ]
    }
    if (path.startsWith('/crm') || activeModule === 'marketing') {
      return [
        { label: 'Nouveau client', icon: <Users size={16} />, run: () => navigate('/crm/clients?action=new') },
        { label: 'Avis du jour', icon: <Search size={16} />, run: () => navigate('/crm/avis?filter=today') },
        { label: 'Lancer campagne', icon: <Megaphone size={16} />, run: () => navigate('/crm/campagnes?action=new') },
      ]
    }
    return [
      { label: 'Cmd+K recherche', icon: <Search size={16} />, run: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })) },
      { label: 'Ouvrir Robi', icon: <Bot size={16} />, run: () => assistant.setOpen(true) },
      { label: 'Modules', icon: <Boxes size={16} />, run: () => navigate('/modules') },
    ]
  }, [activeModule, assistant, location.pathname, navigate])

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 112, zIndex: 9998, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      <AnimatePresence>
        {open && actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, delay: index * 0.025 }}
            onClick={() => {
              setOpen(false)
              action.run()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              border: '1px solid rgba(167,139,250,0.3)',
              background: 'rgba(15,23,42,0.92)',
              color: '#f8fafc',
              borderRadius: 14,
              padding: '10px 12px',
              boxShadow: '0 18px 45px rgba(0,0,0,0.32)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 800,
              minWidth: 178,
              justifyContent: 'flex-start',
            }}
          >
            {action.icon}
            {action.label}
          </motion.button>
        ))}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: open ? 45 : 0 }}
        onClick={() => setOpen((v) => !v)}
        title="Actions rapides"
        style={{
          width: 58,
          height: 58,
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          color: '#fff',
          boxShadow: '0 20px 50px rgba(124,58,237,0.36)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Plus size={28} />
      </motion.button>
    </div>
  )
}
