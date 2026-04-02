export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-LU', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-LU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getElapsedMinutes(date: string | Date): number {
  const now = new Date()
  const then = new Date(date)
  return Math.floor((now.getTime() - then.getTime()) / 60000)
}

export function formatElapsed(date: string | Date): string {
  const minutes = getElapsedMinutes(date)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins.toString().padStart(2, '0')}min`
}
