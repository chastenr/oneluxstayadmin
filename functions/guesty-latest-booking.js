import {
  getCachedReservationSnapshot,
  getLatestReservation,
  getRecentReservations,
} from './_lib/guesty.js'

export const handler = async () => {
  try {
    const recentBookings = await getRecentReservations(10)
    const booking = recentBookings[0] || (await getLatestReservation())

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
