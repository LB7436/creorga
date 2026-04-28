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

  return (
    <motion.button
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={() => a.setOpen(true)}
      title={`Ouvrir ${a.name} (Ctrl+Shift+A)`}
      style={{
        position: 'fixed', bottom: 96, right: 24, zIndex: 9996,
        width: 64, height: 64, borderRadius: '50%', cursor: 'pointer',
        border: 'none',
        background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
        boxShadow: '0 12px 32px rgba(139,92,246,0.5), 0 0 0 4px rgba(167,139,250,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
      }}
    >
      <AssistantMascot variant={a.mascot} size={56} />
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
