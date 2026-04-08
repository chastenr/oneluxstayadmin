/* global process */

import {
  getCachedReservationSnapshot,
  getLatestReservation,
  getRecentReservations,
} from './_lib/guesty.js'

const DEFAULT_HANDLER_TIMEOUT_MS = 12000

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
  try {
    const recentBookings = await withHardTimeout(
      getRecentReservations(10),
      getHandlerTimeoutMs(),
      'Guesty latest-booking handler'
    )
    const booking = recentBookings[0] || null
      ))

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: true,
        booking,
        recentBookings,
      }),
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
