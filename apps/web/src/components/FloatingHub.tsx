import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Bot, Boxes, Receipt, Users, CalendarDays, Camera,
  Megaphone, PackageSearch, Sparkles, X, Zap, LifeBuoy, ChevronLeft,
} from 'lucide-react'
import { useModuleStore } from '@/stores/moduleStore'
import { useAssistant } from '@/stores/assistantStore'
import { useHelp } from '@/stores/helpStore'
import { fetchAuth } from '@/lib/fetchAuth'
import AssistantMascot from './AssistantMascot'

/**
 * Lanceur flottant unique — bas à droite.
 *
 * Remplace trois boutons flottants qui se chevauchaient : `QuickActionsFAB`
 * (bottom 112), `AssistantLauncher` (bottom 96) et le déclencheur interne de
 * `HelpChatbot` (bottom 24). Seize pixels séparaient les deux premiers pour des
 * boutons de 58 et 64 px de haut : celui du milieu était donc recouvert de part
 * et d'autre et devenait difficile à viser.
 *
 * Un seul bouton ouvre désormais un menu à trois entrées :
 *   ⚡ Actions rapides — raccourcis contextuels selon le module courant
 *   🤖 l'assistant     — nom et mascotte choisis par l'utilisateur
 *   🛟 Centre d'aide   — guides, vidéos, agent
 */

type Action = {
  label: string
  icon: React.ReactNode
  run: () => void
}

type Vue = 'racine' | 'actions'

export default function FloatingHub() {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [vue, setVue] = useState<Vue>('racine')
  const location = useLocation()
  const navigate = useNavigate()
  const activeModule = useModuleStore((s) => s.activeModule)
  const assistant = useAssistant()
  const help = useHelp()

  const actions = useMemo<Action[]>(() => {
    const path = location.pathname
    const askAgent = async (text: string) => {
      await fetchAuth('/api/agent/intent', {
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

  // Le panneau de l'assistant occupe déjà le coin bas-droit : on efface le
  // lanceur pendant ce temps, comme le faisait AssistantLauncher.
  if (assistant.open) return null

  const compact = assistant.launcherSize !== 'normal'
  const taille = compact ? 50 : 58

  const fermerMenu = () => {
    setMenuOuvert(false)
    setVue('racine')
  }

  const choisir = (run: () => void) => {
    fermerMenu()
    run()
  }

  const auClicPrincipal = () => {
    // Le panneau d'aide n'a pas d'autre bouton de fermeture que celui-ci.
    if (help.open) {
      help.setOpen(false)
      return
    }
    if (menuOuvert) {
      fermerMenu()
      return
    }
    setMenuOuvert(true)
  }

  const entrees = [
    {
      id: 'actions',
      label: 'Actions rapides',
      detail: `${actions.length} raccourcis pour cette page`,
      icon: <Zap size={18} />,
      onClick: () => setVue('actions'),
    },
    {
      id: 'assistant',
      label: assistant.name,
      detail: 'Assistant IA',
      icon: <AssistantMascot variant={assistant.mascot} size={22} />,
      onClick: () => choisir(() => assistant.setOpen(true)),
    },
    {
      id: 'aide',
      label: "Centre d'aide",
      detail: 'Guides, vidéos, agent',
      icon: <LifeBuoy size={18} />,
      onClick: () => choisir(() => help.setOpen(true)),
    },
  ]

  const styleEntree: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: 244,
    border: '1px solid rgba(167,139,250,0.3)',
    background: 'rgba(15,23,42,0.94)',
    color: '#f8fafc',
    borderRadius: 14,
    padding: '10px 13px',
    boxShadow: '0 18px 45px rgba(0,0,0,0.32)',
    cursor: 'pointer',
    textAlign: 'left',
  }

  return (
    <>
      {/* Fermeture au clic à côté */}
      {menuOuvert && (
        <div
          onClick={fermerMenu}
          style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
          aria-hidden="true"
        />
      )}

      <div
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 9998,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
        }}
      >
        <AnimatePresence mode="popLayout">
          {menuOuvert && vue === 'racine' && entrees.map((entree, index) => (
            <motion.button
              key={entree.id}
              type="button"
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, delay: index * 0.03 }}
              onClick={entree.onClick}
              style={styleEntree}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                background: 'rgba(124,58,237,0.22)',
                display: 'grid', placeItems: 'center',
              }}>
                {entree.icon}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{entree.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{entree.detail}</span>
              </span>
            </motion.button>
          ))}

          {menuOuvert && vue === 'actions' && (
            <>
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  type="button"
                  initial={{ opacity: 0, y: 18, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30, delay: index * 0.03 }}
                  onClick={() => choisir(action.run)}
                  style={{ ...styleEntree, gap: 9 }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                    background: 'rgba(124,58,237,0.22)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    {action.icon}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{action.label}</span>
                </motion.button>
              ))}
              <motion.button
                key="retour"
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={() => setVue('racine')}
                style={{
                  ...styleEntree,
                  width: 'auto',
                  gap: 7,
                  padding: '8px 13px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#c4b5fd',
                }}
              >
                <ChevronLeft size={15} /> Retour
              </motion.button>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: menuOuvert ? 45 : 0 }}
          onClick={auClicPrincipal}
          title={help.open ? "Fermer le centre d'aide" : 'Assistant, aide et actions rapides'}
          aria-label={help.open ? "Fermer le centre d'aide" : 'Assistant, aide et actions rapides'}
          aria-expanded={menuOuvert}
          style={{
            position: 'relative',
            width: taille,
            height: taille,
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
          {help.open
            ? <X size={26} />
            : menuOuvert
              ? <Plus size={26} />
              : <Sparkles size={25} />}

          {!menuOuvert && !help.open && assistant.messages.length > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              minWidth: 19, height: 19, borderRadius: 999, padding: '0 5px',
              background: '#10b981', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, border: '2px solid #0a0a14',
            }}>{assistant.messages.length}</span>
          )}
        </motion.button>
      </div>
    </>
  )
}
