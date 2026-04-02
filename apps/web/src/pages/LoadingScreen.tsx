import { Spinner } from '@/components/ui'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-2 gap-4">
      <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
        <span className="text-white font-bold text-2xl">C</span>
      </div>
      <Spinner size="lg" className="text-primary" />
      <p className="text-sm text-gray-400">Chargement...</p>
    </div>
  )
}
