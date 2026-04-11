import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem { label: string; path: string; icon: LucideIcon }
interface ModuleLayoutProps { title: string; color: string; items: NavItem[]; backPath?: string }

export default function ModuleLayout({ title, color, items, backPath = '/modules' }: ModuleLayoutProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-52 shrink-0 bg-white border-r border-gray-100 flex flex-col py-4 overflow-y-auto">
        <div className="px-4 mb-4">
          <button onClick={() => navigate(backPath)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors">
            <ChevronLeft size={12} /> Modules
          </button>
          <h2 className="font-bold text-sm text-gray-800">{title}</h2>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {items.map(item => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
            } style={({ isActive }) => isActive ? { backgroundColor: color } : {}}>
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </div>
    </div>
  )
}
