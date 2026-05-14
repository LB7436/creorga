import { motion } from 'framer-motion'
import AssistantMascot from './AssistantMascot'
import { useAssistant } from '@/stores/assistantStore'

/**
 * Floating launcher button for the personal assistant.
 * Bottom-right, just above the HelpChatbot bubble.
 */

export default function AssistantLauncher() {
  const a = useAssistant()
  if (a.open) return null
  const compact = a.launcherSize !== 'normal'
  const size = compact ? 48 : 64
  const mascotSize = compact ? 42 : 56

  return (
    <motion.button
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      onClick={() => a.setOpen(true)}
      title={`Ouvrir ${a.name} (Ctrl+Shift+A)`}
      style={{
        position: 'fixed', bottom: compact ? 74 : 96, right: compact ? 14 : 24, zIndex: 9996,
        width: size, height: size, borderRadius: '50%', cursor: 'pointer',
        border: 'none',
        background: '#7c3aed',
        boxShadow: compact ? '0 8px 18px rgba(0,0,0,0.28)' : '0 12px 28px rgba(0,0,0,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
      }}
    >
      <AssistantMascot variant={a.mascot} size={mascotSize} />
      {a.messages.length > 0 && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          minWidth: 18, height: 18, borderRadius: 999, padding: '0 5px',
          background: '#10b981', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, border: '2px solid #0a0a14',
        }}>{a.messages.length}</div>
      )}
    </motion.button>
  )
}
