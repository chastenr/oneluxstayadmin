import { createClient } from '@supabase/supabase-js'
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
  return String(process.env.SUPERADMIN_EMAILS || process.env.VITE_SUPERADMIN_EMAILS || '')
    .split(',')
    .map(normalizeValue)
    .filter(Boolean)
}

function isSuperAdminUser(user) {
  if (!user) {
    return false
  }

  const appMetadata = user.app_metadata || {}
  const userMetadata = user.user_metadata || {}
  const roles = [
    ...collectRoles(appMetadata.role),
    ...collectRoles(appMetadata.roles),
    ...collectRoles(userMetadata.role),
    ...collectRoles(userMetadata.roles),
  ]

  if (roles.some((role) => SUPERADMIN_ROLE_NAMES.has(role))) {
    return true
  }

  const email = normalizeValue(user.email)
  return !!email && getConfiguredSuperAdminEmails().includes(email)
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing server-side Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

async function getRequesterUser(event, supabaseAdmin) {
  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)

  if (!tokenMatch) {
    return {
      statusCode: 401,
      error: 'You must be signed in as a superadmin to create accounts.',
    }
  }

  const accessToken = tokenMatch[1].trim()
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken)

  if (error || !data?.user) {
    return {
      statusCode: 401,
      error: 'Your session could not be verified. Please sign in again.',
    }
  }

  if (!isSuperAdminUser(data.user)) {
    return {
      statusCode: 403,
      error: 'Only superadmins can create accounts.',
    }
  }

  return {
    user: data.user,
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' })
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const requester = await getRequesterUser(event, supabaseAdmin)

    if (requester.error) {
      return json(requester.statusCode, {
        error: requester.error,
      })
    }

    const body = JSON.parse(event.body || '{}')
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!fullName || !email || !password) {
      return json(400, {
        error: 'Full name, email, and password are required.',
      })
    }

    if (password.length < 6) {
      return json(400, {
        error: 'Password must be at least 6 characters.',
      })
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: 'admin',
      },
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    })

    if (error) {
      const message = error.message || 'Unable to create the account.'
      const lowerMessage = message.toLowerCase()
      const statusCode =
        error.status ||
        (lowerMessage.includes('already') || lowerMessage.includes('exists') ? 409 : 500)

      return json(statusCode, {
        error: message,
      })
    }

    return json(200, {
      user: {
        id: data.user?.id || null,
        email: data.user?.email || email,
      },
    })
  } catch (error) {
    return json(500, {
      error: error.message || 'Unable to create the account.',
    })
  }
}
