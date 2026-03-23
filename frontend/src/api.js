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

  // Partner — patients
  getPatients: () => request('GET', '/patients'),
  getPatient: (id) => request('GET', `/patients/${id}`),
  createPatient: (data) => request('POST', '/patients', data),
  deletePatient: (id) => request('DELETE', `/patients/${id}`),

  // Partner — QR codes
  getBudget: () => request('GET', '/qrcodes/budget'),
  generateQR: (patientId) => request('POST', `/qrcodes/generate/${patientId}`),
  getQRImage: (patientId) => request('GET', `/qrcodes/image/${patientId}`),
  revokeQR: (patientId) => request('DELETE', `/qrcodes/revoke/${patientId}`),

  // Partner — payments
  getPaymentHistory: () => request('GET', '/payments/history'),
  initiatePayment: (method) => request('POST', '/payments/initiate', { method }),
  confirmPayment: (method) => request('POST', '/payments/confirm', { method }),

  // Scanner (public)
  validateQR: (token, useType) => request('POST', '/scanner/validate', { token, useType })
}
