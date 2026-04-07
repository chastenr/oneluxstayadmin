const GUESTY_OPEN_API_BASE = 'https://open-api.guesty.com/v1'
const GUESTY_AUTH_URL = 'https://open-api.guesty.com/oauth2/token'

let cachedToken = null
let cachedTokenExpiresAt = 0

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

export function getGuestyCredentials() {
  const clientId =
    process.env.GUESTY_CLIENT_ID ??
    process.env.GUESTY_OPEN_API_CLIENT_ID ??
    process.env.GUESTY_BE_CLIENT_ID
  const clientSecret =
    process.env.GUESTY_CLIENT_SECRET ??
    process.env.GUESTY_OPEN_API_CLIENT_SECRET ??
    process.env.GUESTY_BE_CLIENT_SECRET

  if (!clientId) {
    throw new Error(
      'Missing Guesty client id. Set GUESTY_CLIENT_ID or GUESTY_OPEN_API_CLIENT_ID.'
    )
  }

  if (!clientSecret) {
    throw new Error(
      'Missing Guesty client secret. Set GUESTY_CLIENT_SECRET or GUESTY_OPEN_API_CLIENT_SECRET.'
    )
  }

  return { clientId, clientSecret }
}

async function fetchGuestyAccessToken() {
  const { clientId, clientSecret } = getGuestyCredentials()

  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  body.set('scope', 'open-api')
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)

  const response = await fetch(GUESTY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Guesty auth failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  cachedTokenExpiresAt = Date.now() + Math.max((data.expires_in ?? 3600) - 60, 60) * 1000

  return cachedToken
}

export async function guestyRequest(path, init = {}) {
  const token = await fetchGuestyAccessToken()
  const response = await fetch(`${GUESTY_OPEN_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Guesty request failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

export function normalizeReservation(reservation) {
  if (!reservation) {
    return null
  }

  const guest =
    reservation.guest ??
    reservation.guestIdData ??
    reservation.primaryGuest ??
    reservation.guestDetails ??
    {}
  const listing =
    reservation.listing ??
    reservation.listingIdData ??
    reservation.unit ??
    reservation.property ??
    {}

  return {
    id: reservation._id ?? reservation.id ?? '',
    confirmationCode:
      reservation.confirmationCode ??
      reservation.reservationId ??
      reservation.integrationId ??
      'Unknown',
    status: reservation.status ?? reservation.moneyStatus ?? 'Unknown',
    source: reservation.source ?? reservation.channel ?? reservation.integration ?? 'Guesty',
    guestName:
      guest.fullName ??
      [guest.firstName, guest.lastName].filter(Boolean).join(' ') ??
      reservation.guestName ??
      'Unknown guest',
    guestEmail: guest.email ?? reservation.guestEmail ?? '',
    listingName: listing.title ?? listing.nickname ?? listing.name ?? 'Unknown listing',
    checkIn:
      reservation.checkInDateLocalized ??
      reservation.checkIn ??
      reservation.startDate ??
      '',
    checkOut:
      reservation.checkOutDateLocalized ??
      reservation.checkOut ??
      reservation.endDate ??
      '',
    totalPrice:
      reservation.totalPrice ??
      reservation.money?.hostPayout ??
      reservation.invoice?.total ??
      null,
    currency:
      reservation.currency ??
      reservation.invoice?.currency ??
      reservation.money?.currency ??
      'USD',
  }
}
