import { getLatestReservation, getRecentReservations } from './_lib/guesty.js'

export const handler = async () => {
  try {
    const [booking, recentBookings] = await Promise.all([
      getLatestReservation(),
      getRecentReservations(10),
    ])

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: true,
        booking,
        recentBookings,
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        connected: false,
        error: error.message,
      }),
    }
  }
}
