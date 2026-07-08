const BASE = '/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido')
  return data
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  verifyToken: () => request('GET', '/auth/verify'),

  // Clinic
  getClinicStats: () => request('GET', '/clinic/stats'),
  getClinicPartners: () => request('GET', '/clinic/partners'),
  createPartner: (data) => request('POST', '/clinic/partners', data),
  getClinicPartner: (id) => request('GET', `/clinic/partners/${id}`),
  updatePartner: (id, data) => request('PUT', `/clinic/partners/${id}`, data),
  toggleBlockPartner: (id) => request('PATCH', `/clinic/partners/${id}/toggle-block`),
  deletePartner: (id) => request('DELETE', `/clinic/partners/${id}`),
  registerPartnerPayment: (id, data) => request('POST', `/clinic/partners/${id}/payments`, data),

  // Partner — profile / settings
  getMyProfile: () => request('GET', '/partner/me'),
  updateMyProfile: (data) => request('PUT', '/partner/me', data),
  changeMyPassword: (currentPassword, newPassword) => request('PUT', '/partner/password', { currentPassword, newPassword }),

  // Partner — patients
  getPatients: () => request('GET', '/patients'),
  getPatient: (id) => request('GET', `/patients/${id}`),
  createPatient: (data) => request('POST', '/patients', data),
  deletePatient: (id) => request('DELETE', `/patients/${id}`),

  // Partner — QR codes
  getBudget: () => request('GET', '/qrcodes/budget'),
  generateQR: (patientId, permissions) => request('POST', `/qrcodes/generate/${patientId}`, permissions),
  getQRImage: (patientId) => request('GET', `/qrcodes/image/${patientId}`).then(d => d.dataUrl),
  revokeQR: (patientId) => request('DELETE', `/qrcodes/revoke/${patientId}`),
  downloadReceipt: async (patientId) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${BASE}/qrcodes/receipt/${patientId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Erro ao baixar recibo')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `recibo_${patientId}_${new Date().getTime()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  // Partner — payments
  getPaymentHistory: () => request('GET', '/payments/history'),
  initiatePayment: (method) => request('POST', '/payments/initiate', { method }),
  confirmPayment: (method) => request('POST', '/payments/confirm', { method }),

  // Scanner (public)
  validateQR: (token, useType) => request('POST', '/scanner/validate', { token, useType }),
  validateQr: (token, useType) => request('POST', '/scanner/validate', { token, useType }),
  getScannerHistory: (limit = 50, skip = 0) => request('GET', `/scanner/history?limit=${limit}&skip=${skip}`),

  // Aliases for page compatibility
  getPartner: (id) => request('GET', `/clinic/partners/${id}`),
  getPartnerPatients: (id) => request('GET', `/clinic/partners/${id}/patients`),
  revokeQr: (patientId) => request('DELETE', `/qrcodes/revoke/${patientId}`),
  regenerateQr: (patientId, permissions) => request('POST', `/qrcodes/generate/${patientId}`, permissions),
  getQRImageUrl: (patientId) => `${BASE}/qrcodes/image/${patientId}`,

  // Combined partner dashboard
  getPartnerDashboard: async () => {
    const [budget, patients] = await Promise.all([
      request('GET', '/qrcodes/budget'),
      request('GET', '/patients')
    ])
    return { partner: budget, patients }
  }
}
