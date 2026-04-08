const apiBase = import.meta.env.VITE_API_BASE || '/.netlify/functions'
const SUMMARY_CACHE_TTL_MS = 15 * 1000
const ERROR_CACHE_TTL_MS = 5 * 1000

let cachedSummary = null
let cachedSummaryAt = 0
let inFlightSummaryPromise = null
let cachedError = null
let cachedErrorAt = 0

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    throw new Error('The server returned an empty response.')
  }

  try {
    return JSON.parse(text)
  } catch {
    if (text.startsWith('<!doctype html') || text.startsWith('<html')) {
      throw new Error(
        'The latest-booking function is not running on this URL yet. If you are testing locally, use Netlify Dev or deploy the site first.'
      )
    }

    throw new Error(text)
  }
}

function shouldUseCachedSummary(force) {
  return !force && cachedSummary && Date.now() - cachedSummaryAt < SUMMARY_CACHE_TTL_MS
}

function shouldUseCachedError(force) {
  return !force && cachedError && Date.now() - cachedErrorAt < ERROR_CACHE_TTL_MS
}

export async function fetchGuestySummary({ force = false } = {}) {
  if (shouldUseCachedSummary(force)) {
    return cachedSummary
  }

  if (shouldUseCachedError(force)) {
    throw cachedError
  }

  if (!force && inFlightSummaryPromise) {
    return inFlightSummaryPromise
  }

  inFlightSummaryPromise = (async () => {
    try {
      const response = await fetch(`${apiBase}/guesty-latest-booking`)
      const data = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to load the latest booking.')
      }

      if (
        data.connected === false &&
        !data.booking &&
        (!Array.isArray(data.recentBookings) || data.recentBookings.length === 0)
      ) {
        throw new Error(data.error ?? 'Guesty data is unavailable right now.')
      }

      cachedSummary = data
      cachedSummaryAt = Date.now()
      cachedError = null
      cachedErrorAt = 0
      return data
    } catch (error) {
      cachedError = error
      cachedErrorAt = Date.now()
      throw error
    }
  })()

  try {
    return await inFlightSummaryPromise
  } finally {
    inFlightSummaryPromise = null
  }
}

export function clearGuestySummaryCache() {
  cachedSummary = null
  cachedSummaryAt = 0
  inFlightSummaryPromise = null
  cachedError = null
  cachedErrorAt = 0
}
