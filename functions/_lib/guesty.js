const GUESTY_OPEN_API_BASE = 'https://open-api.guesty.com/v1'
const GUESTY_AUTH_URL = 'https://open-api.guesty.com/oauth2/token'
const DEFAULT_RESERVATION_CACHE_MS = 30 * 1000

let cachedToken = null
let cachedTokenExpiresAt = 0
let inFlightTokenPromise = null
let cachedLatestReservation = null
let cachedLatestReservationAt = 0

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getReservationCacheMs() {
  const configuredMs = Number(process.env.GUESTY_MIN_INTERVAL_MS)

  if (Number.isFinite(configuredMs) && configuredMs > 0) {
    return configuredMs
  }

  return DEFAULT_RESERVATION_CACHE_MS
}

function getRetryDelayMs(response, attempt) {
  const retryAfterHeader = response.headers.get('retry-after')
  const retryAfterSeconds = Number(retryAfterHeader)

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }

  return Math.min(1000 * 2 ** attempt, 5000)
}

function getGuestyCredentials() {
  const clientId =
    process.env.GUESTY_CLIENT_ID ||
    process.env.GUESTY_OPEN_API_CLIENT_ID ||
    process.env.GUESTY_BE_CLIENT_ID
  const clientSecret =
    process.env.GUESTY_CLIENT_SECRET ||
    process.env.GUESTY_OPEN_API_CLIENT_SECRET ||
    process.env.GUESTY_BE_CLIENT_SECRET

  if (!clientId) {
    throw new Error(
      'Missing Guesty client id. Set GUESTY_CLIENT_ID, GUESTY_OPEN_API_CLIENT_ID, or GUESTY_BE_CLIENT_ID.'
    )
  }

  if (!clientSecret) {
    throw new Error(
      'Missing Guesty client secret. Set GUESTY_CLIENT_SECRET, GUESTY_OPEN_API_CLIENT_SECRET, or GUESTY_BE_CLIENT_SECRET.'
    )
  }

  return { clientId, clientSecret }
}

async function fetchGuestyAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken
  }

  if (inFlightTokenPromise) {
    return inFlightTokenPromise
  }

  inFlightTokenPromise = (async () => {
    const { clientId, clientSecret } = getGuestyCredentials()

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const body = new URLSearchParams()
      body.set('grant_type', 'client_credentials')
      body.set('scope', 'open-api')
      body.set('client_id', clientId)
      body.set('client_secret', clientSecret)

      const response = await fetch(GUESTY_AUTH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })

      if (response.ok) {
        const data = await response.json()
        cachedToken = data.access_token
        cachedTokenExpiresAt = Date.now() + Math.max((data.expires_in || 3600) - 60, 60) * 1000
        return cachedToken
      }

      if (response.status === 429 && attempt < 2) {
        await sleep(getRetryDelayMs(response, attempt))
        continue
      }

      const errorText = await response.text()
      throw new Error(`Guesty auth failed: ${response.status} ${errorText}`)
    }

    throw new Error('Guesty auth failed after multiple retries.')
  })()

  try {
    return await inFlightTokenPromise
  } finally {
    inFlightTokenPromise = null
  }
}

function clearCachedToken() {
  cachedToken = null
  cachedTokenExpiresAt = 0
}

async function fetchGuestyJson(path, token) {
  const response = await fetch(`${GUESTY_OPEN_API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.ok) {
    return response.json()
  }

  const errorText = await response.text()
  const error = new Error(`Guesty request failed: ${response.status} ${errorText}`)
  error.statusCode = response.status
  throw error
}

async function guestyRequest(path) {
  const token = await fetchGuestyAccessToken()

  try {
    return await fetchGuestyJson(path, token)
  } catch (error) {
    if (error.statusCode === 401) {
      clearCachedToken()
      const refreshedToken = await fetchGuestyAccessToken()
      return fetchGuestyJson(path, refreshedToken)
    }

    throw error
  }
}

function normalizeReservation(reservation) {
  if (!reservation) {
    return null
  }

  const guest =
    reservation.guest ||
    reservation.guestIdData ||
    reservation.primaryGuest ||
    reservation.guestDetails ||
    {}
  const listing =
    reservation.listing ||
    reservation.listingIdData ||
    reservation.unit ||
    reservation.property ||
    {}

  return {
    id: reservation._id || reservation.id || '',
    confirmationCode:
      reservation.confirmationCode ||
      reservation.reservationId ||
      reservation.integrationId ||
      'Unknown',
    status: reservation.status || reservation.moneyStatus || 'Unknown',
    source: reservation.source || reservation.channel || reservation.integration || 'Guesty',
    guestName:
      guest.fullName ||
      [guest.firstName, guest.lastName].filter(Boolean).join(' ') ||
      reservation.guestName ||
      'Unknown guest',
    guestEmail: guest.email || reservation.guestEmail || '',
    listingName: listing.title || listing.nickname || listing.name || 'Unknown listing',
    checkIn:
      reservation.checkInDateLocalized ||
      reservation.checkIn ||
      reservation.startDate ||
      '',
    checkOut:
      reservation.checkOutDateLocalized ||
      reservation.checkOut ||
      reservation.endDate ||
      '',
    totalPrice:
      reservation.totalPrice ||
      (reservation.money && reservation.money.hostPayout) ||
      (reservation.invoice && reservation.invoice.total) ||
      null,
    currency:
      reservation.currency ||
      (reservation.invoice && reservation.invoice.currency) ||
      (reservation.money && reservation.money.currency) ||
      'USD',
  }
}

export async function getLatestReservation() {
  const cacheMs = getReservationCacheMs()

  if (cachedLatestReservation && Date.now() - cachedLatestReservationAt < cacheMs) {
    return cachedLatestReservation
  }

  try {
    const data = await guestyRequest('/reservations?limit=1&sort=-createdAt')
    const reservations = Array.isArray(data)
      ? data
      : data.results || data.reservations || data.data || []

    cachedLatestReservation = normalizeReservation(reservations[0] || null)
    cachedLatestReservationAt = Date.now()
    return cachedLatestReservation
  } catch (error) {
    if (error.statusCode === 429 && cachedLatestReservation) {
      return cachedLatestReservation
    }

    throw error
  }
}
