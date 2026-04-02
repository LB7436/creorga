import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import RequireAuth from '@/components/auth/RequireAuth'
import Login from '@/pages/Login'
import Welcome from '@/pages/Welcome'
import ModuleSelector from '@/pages/ModuleSelector'
import Dashboard from '@/pages/Dashboard'
import NotFound from '@/pages/NotFound'
import FloorPlan from '@/pages/pos/FloorPlan'
import OrderPage from '@/pages/pos/OrderPage'
import Checkout from '@/pages/pos/Checkout'
import Kitchen from '@/pages/pos/Kitchen'
import SettingsCompany from '@/pages/settings/SettingsCompany'
import SettingsTables from '@/pages/settings/SettingsTables'
import SettingsCatalog from '@/pages/settings/SettingsCatalog'
import SettingsUsers from '@/pages/settings/SettingsUsers'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminCompany from '@/pages/admin/AdminCompany'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminCatalog from '@/pages/admin/AdminCatalog'
import AdminModules from '@/pages/admin/AdminModules'
import ClientsConfig from '@/pages/clients/ClientsConfig'
import GuestHome from '@/pages/guest/GuestHome'

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Welcome splash (after login) */}
      <Route
        path="/welcome"
        element={
          <RequireAuth>
            <Welcome />
          </RequireAuth>
        }
      />

      {/* Module selector */}
      <Route
        path="/modules"
        element={
          <RequireAuth>
            <ModuleSelector />
          </RequireAuth>
        }
      />

      {/* Admin panel (owner/manager only — enforced inside AdminLayout) */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/company" replace />} />
        <Route path="company" element={<AdminCompany />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="catalog" element={<AdminCatalog />} />
        <Route path="modules" element={<AdminModules />} />
      </Route>

      {/* Interface client (publique — accessible sans auth via QR code) */}
      <Route path="/c" element={<GuestHome />} />

      {/* Accès Clients */}
      <Route
        path="/clients"
        element={
          <RequireAuth>
            <ClientsConfig />
          </RequireAuth>
        }
      />

      {/* Kitchen — fullscreen, no sidebar */}
      <Route
        path="/pos/kitchen"
        element={
          <RequireAuth>
            <Kitchen />
          </RequireAuth>
        }
      />

      {/* Protected avec layout */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/modules" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pos" element={<FloorPlan />} />
        <Route path="/pos/order/:tableId" element={<OrderPage />} />
        <Route path="/pos/checkout/:orderId" element={<Checkout />} />
        <Route path="/settings" element={<Navigate to="/settings/company" replace />} />
        <Route path="/settings/company" element={<SettingsCompany />} />
        <Route path="/settings/tables" element={<SettingsTables />} />
        <Route path="/settings/catalog" element={<SettingsCatalog />} />
        <Route path="/settings/users" element={<SettingsUsers />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
