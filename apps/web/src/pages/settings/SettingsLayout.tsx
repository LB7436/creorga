import { NavLink } from 'react-router-dom'
import { Building2, LayoutGrid, Package, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { TopBar } from '@/components/layout'

const tabs = [
  { to: '/settings/company', icon: Building2, label: 'Société' },
  { to: '/settings/tables', icon: LayoutGrid, label: 'Plan de salle' },
  { to: '/settings/catalog', icon: Package, label: 'Catalogue' },
  { to: '/settings/users', icon: Users, label: 'Utilisateurs' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TopBar title="Paramètres" />
      <div className="border-b border-gray-100 bg-white px-6">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )
              }
            >
              <tab.icon size={16} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
