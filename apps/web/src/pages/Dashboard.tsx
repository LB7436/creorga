import { TopBar } from '@/components/layout'
import { Card } from '@/components/ui'
import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: typeof DollarSign
  color: string
  bgColor: string
}

function StatCard({ title, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon size={22} className={color} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  return (
    <div>
      <TopBar title="Tableau de bord" subtitle="Vue d'ensemble de votre activité" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="CA Aujourd'hui"
            value="0,00 €"
            icon={DollarSign}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            title="Tables libres"
            value="9 / 9"
            icon={Users}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Commandes en cours"
            value="0"
            icon={ShoppingCart}
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
          <StatCard
            title="Ticket moyen"
            value="0,00 €"
            icon={TrendingUp}
            color="text-violet-600"
            bgColor="bg-violet-50"
          />
        </div>

        {/* Placeholder charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 mb-4">CA 7 derniers jours</h3>
            <div className="h-48 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
              Graphique disponible après les premières ventes
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 mb-4">Top 5 produits</h3>
            <div className="h-48 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
              Données disponibles après les premières ventes
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
