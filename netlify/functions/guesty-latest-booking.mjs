import { guestyRequest, normalizeReservation } from './_lib/guesty.mjs'

export default async function handler() {
  try {
    const data = await guestyRequest('/reservations?limit=1&sort=-createdAt')
    const reservations = Array.isArray(data)
      ? data
      : data.results ?? data.reservations ?? data.data ?? []
    const latestReservation = reservations[0] ?? null

    return Response.json({
      connected: true,
      booking: normalizeReservation(latestReservation),
    })
  } catch (error) {
    return Response.json(
      {
        connected: false,
        error: error.message,
      },
      {
        status: 500,
      }
    )
  }
}
