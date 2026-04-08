/* global process */

import {
  getCachedReservationSnapshot,
  getRecentReservations,
} from './_lib/guesty.js'

// ✅ CACHE (add this at top)
let cache = null
let lastFetch = 0
const CACHE_DURATION = 30000 // 30 seconds

const DEFAULT_HANDLER_TIMEOUT_MS = 8000

function getHandlerTimeoutMs() {
  const configuredMs = Number(process.env.GUESTY_HANDLER_TIMEOUT_MS)

  if (Number.isFinite(configuredMs) && configuredMs > 0) {
    return configuredMs
  }

  return DEFAULT_HANDLER_TIMEOUT_MS
}

function withHardTimeout(promise, timeoutMs, label) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

export const handler = async () => {
  const now = Date.now()

  // ✅ RETURN CACHE (prevents rate limit)
  if (cache && now - lastFetch < CACHE_DURATION) {
    console.log("Returning cached data")
    return {
      statusCode: 200,
      body: JSON.stringify(cache),
    }
  }

  try {
    console.log("Fetching from Guesty...")

    const recentBookings = await withHardTimeout(
      getRecentReservations(1), // ✅ FIX: only 1 booking
      getHandlerTimeoutMs(),
      'Guesty latest-booking handler'
    )

    const booking = recentBookings[0] || null

    const data = {
      connected: true,
      booking,
      recentBookings,
    }

    // ✅ SAVE CACHE
    cache = data
    lastFetch = now

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    }

  } catch (error) {
    const cachedSnapshot = getCachedReservationSnapshot()

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: false,
        booking: cachedSnapshot.booking ?? null,
        recentBookings: cachedSnapshot.recentBookings ?? [],
        cachedAt: cachedSnapshot.cachedAt,
        error: error.message,
      }),
    }
  }
}