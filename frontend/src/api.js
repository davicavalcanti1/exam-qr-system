const BASE = '/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido')
  return data
}

export const api = {
  login: (password) => request('POST', '/auth/login', { password }),
  verifyToken: () => request('GET', '/auth/verify'),

  getPatients: () => request('GET', '/patients'),
  getPatient: (id) => request('GET', `/patients/${id}`),
  createPatient: (data) => request('POST', '/patients', data),
  deletePatient: (id) => request('DELETE', `/patients/${id}`),

  getBudget: () => request('GET', '/qrcodes/budget'),
  generateQR: (patientId) => request('POST', `/qrcodes/generate/${patientId}`),
  getQRImage: (patientId) => request('GET', `/qrcodes/image/${patientId}`),

  validateQR: (token, useType) => request('POST', '/scanner/validate', { token, useType })
}
