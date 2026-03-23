import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { getUser } from './auth'

import Login from './pages/Login'
import Scanner from './pages/Scanner'

// Partner pages
import Dashboard from './pages/Dashboard'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import Payment from './pages/Payment'
import PartnerNavbar from './components/PartnerNavbar'

// Clinic pages
import ClinicDashboard from './pages/clinic/ClinicDashboard'
import ClinicPartnerForm from './pages/clinic/PartnerForm'
import ClinicPartnerDetail from './pages/clinic/PartnerDetail'
import ClinicNavbar from './components/ClinicNavbar'

function ClinicLayout() {
  const user = getUser()
  if (!user || user.role !== 'clinic') {
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <ClinicNavbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

function PartnerLayout() {
  const user = getUser()
  if (!user || user.role !== 'partner') {
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <PartnerNavbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

function RootRedirect() {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'clinic') return <Navigate to="/clinic" replace />
  if (user.role === 'partner') return <Navigate to="/dashboard" replace />
  // role desconhecida — limpa e manda pro login
  localStorage.removeItem('token')
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Clinic routes */}
        <Route element={<ClinicLayout />}>
          <Route path="/clinic" element={<ClinicDashboard />} />
          <Route path="/clinic/partners/new" element={<ClinicPartnerForm />} />
          <Route path="/clinic/partners/:id" element={<ClinicPartnerDetail />} />
        </Route>

        {/* Partner routes */}
        <Route element={<PartnerLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients/new" element={<PatientForm />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/payment" element={<Payment />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
