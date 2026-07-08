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

export function partnerRole() {
  return getUser()?.partnerRole || null
}

export function isCoordenador() {
  const u = getUser()
  // tokens antigos (sem partnerRole) contam como coordenador por compatibilidade
  return u?.role === 'partner' && (u.partnerRole ? u.partnerRole === 'coordenador' : true)
}

export function isFuncionario() {
  return getUser()?.partnerRole === 'funcionario'
}

export function logout() {
  localStorage.removeItem('token')
}
