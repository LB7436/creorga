import { Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, Bell } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function AppShell() {
  const navigate = useNavigate()
  const { user, company } = useAuthStore()
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 shadow-sm h-14 flex items-center px-6 gap-4 shrink-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <span className="font-semibold text-gray-800 text-sm truncate max-w-[160px]">{company?.name ?? 'Creorga'}</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => navigate('/modules')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all font-medium">
          <LayoutGrid size={15} />
          Modules
        </button>
        <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
          </div>
          <span className="text-sm text-gray-600 font-medium hidden sm:block">{user?.firstName}</span>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
