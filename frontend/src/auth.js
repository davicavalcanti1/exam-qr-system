export function getUser() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function isClinic() {
  return getUser()?.role === 'clinic'
}

export function isPartner() {
  return getUser()?.role === 'partner'
}

export function logout() {
  localStorage.removeItem('token')
}
