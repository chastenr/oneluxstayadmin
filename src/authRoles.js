const SUPERADMIN_ROLE_NAMES = new Set(['superadmin', 'super_admin', 'super-admin'])

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase()
}

function collectRoles(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue).filter(Boolean)
  }

  const normalized = normalizeValue(value)
  return normalized ? [normalized] : []
}

function getConfiguredSuperAdminEmails() {
  return String(import.meta.env.VITE_SUPERADMIN_EMAILS || '')
    .split(',')
    .map(normalizeValue)
    .filter(Boolean)
}

export function getUserRoles(user) {
  if (!user) {
    return []
  }

  const appMetadata = user.app_metadata || {}
  const userMetadata = user.user_metadata || {}

  return [
    ...collectRoles(appMetadata.role),
    ...collectRoles(appMetadata.roles),
    ...collectRoles(userMetadata.role),
    ...collectRoles(userMetadata.roles),
  ]
}

export function isSuperAdminUser(user) {
  if (!user) {
    return false
  }

  const roles = getUserRoles(user)

  if (roles.some((role) => SUPERADMIN_ROLE_NAMES.has(role))) {
    return true
  }

  const email = normalizeValue(user.email)
  return !!email && getConfiguredSuperAdminEmails().includes(email)
}

export function getUserAccessRole(user) {
  if (!user) {
    return 'guest'
  }

  return isSuperAdminUser(user) ? 'superadmin' : 'admin'
}
