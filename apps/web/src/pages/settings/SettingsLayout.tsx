import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Building2, LayoutGrid, Package, Users, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { TopBar } from '@/components/layout'

interface Tab {
  to: string
  icon: React.ElementType
  label: string
  description: string
  keywords: string[]
}

const tabs: Tab[] = [
  {
    to: '/settings/company',
    icon: Building2,
    label: 'Général',
    description: 'Informations de la société, coordonnées, logo et identité visuelle',
    keywords: ['société', 'entreprise', 'siret', 'tva', 'adresse', 'logo', 'company'],
  },
  {
    to: '/settings/catalog',
    icon: Package,
    label: 'Catalogue',
    description: 'Produits, catégories, prix, variantes et menus',
    keywords: ['produits', 'menus', 'prix', 'categories', 'variantes', 'catalog'],
  },
  {
    to: '/settings/tables',
    icon: LayoutGrid,
    label: 'Tables',
    description: 'Plan de salle, tables, zones et emplacements',
    keywords: ['salle', 'tables', 'zones', 'plan', 'tables'],
  },
  {
    to: '/settings/users',
    icon: Users,
    label: 'Utilisateurs',
    description: 'Équipe, rôles, permissions et accès',
    keywords: ['équipe', 'staff', 'rôles', 'permissions', 'accès', 'users'],
  },
]

const SLATE = '#475569'
const BORDER = '#e2e8f0'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const filteredTabs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabs
    return tabs.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q)),
    )
  }, [query])

  return (
    <div>
      <TopBar title="Paramètres" />

      {/* Search */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: `1px solid ${BORDER}`,
          padding: '14px 24px',
        }}
      >
        <div
          style={{
            position: 'relative',
            maxWidth: 480,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un paramètre..."
            style={{
              width: '100%',
              padding: '9px 36px 9px 36px',
              fontSize: 14,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              background: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = SLATE
              e.currentTarget.style.background = '#ffffff'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = BORDER
              e.currentTarget.style.background = '#f8fafc'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: '#ffffff',
          padding: '0 24px',
        }}
      >
        <nav style={{ display: 'flex', gap: 4, marginBottom: -1 }}>
          {filteredTabs.length === 0 ? (
            <div style={{ padding: '14px 0', fontSize: 13, color: '#94a3b8' }}>
              Aucun paramètre trouvé pour «{query}»
            </div>
          ) : (
            filteredTabs.map((tab) => (
              <div
                key={tab.to}
                style={{ position: 'relative' }}
                onMouseEnter={() => setHovered(tab.to)}
                onMouseLeave={() => setHovered(null)}
              >
                <NavLink
                  to={tab.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      isActive
                        ? 'border-slate-600 text-slate-800'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
                    )
                  }
                  style={({ isActive }) => ({
                    borderBottomColor: isActive ? SLATE : 'transparent',
                    color: isActive ? '#1e293b' : undefined,
                  })}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </NavLink>

                {hovered === tab.to && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#1e293b',
                      color: '#ffffff',
                      fontSize: 12,
                      padding: '8px 12px',
                      borderRadius: 8,
                      whiteSpace: 'nowrap',
                      maxWidth: 280,
                      zIndex: 20,
                      pointerEvents: 'none',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
                    }}
                  >
                    <div style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
                      {tab.description}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: 8,
                        height: 8,
                        background: '#1e293b',
                      }}
                    />
                  </motion.div>
                )}
              </div>
            ))
          )}
        </nav>
      </div>

      <div style={{ padding: 24 }}>{children}</div>
    </div>
  )
}
