import { guestyRequest, normalizeReservation } from './_lib/guesty.mjs'

function buildAssistantReply(question, booking) {
  if (!booking) {
    return 'Guesty is connected, but I could not find a recent reservation yet.'
  }

  const lowerQuestion = question.toLowerCase()
  const amount =
    booking.totalPrice != null ? `${booking.currency} ${booking.totalPrice}` : 'an unknown amount'

  if (lowerQuestion.includes('latest') || lowerQuestion.includes('booking')) {
    return `Latest booking: ${booking.guestName} at ${booking.listingName}. Check-in ${booking.checkIn}, check-out ${booking.checkOut}, status ${booking.status}.`
  }

  if (lowerQuestion.includes('arrival') || lowerQuestion.includes('check-in')) {
    return `${booking.guestName} is the latest reservation. Arrival is ${booking.checkIn} at ${booking.listingName}.`
  }

  if (lowerQuestion.includes('deposit')) {
    return `I can see the latest reservation for ${booking.guestName}, but deposit status is not mapped from Guesty yet. We still need Stripe deposit integration on the backend.`
  }

  if (lowerQuestion.includes('price') || lowerQuestion.includes('revenue') || lowerQuestion.includes('amount')) {
    return `The latest reservation for ${booking.guestName} at ${booking.listingName} is recorded for ${amount}.`
  }

  return `Latest reservation I found: ${booking.guestName} at ${booking.listingName}, ${booking.checkIn} to ${booking.checkOut}, status ${booking.status}.`
}

export default async function handler(request) {
  try {
    const body = request.method === 'POST' ? await request.json() : {}
    const question = String(body.question ?? '').trim()

    if (!question) {
      return Response.json(
        { error: 'A question is required.' },
        {
          status: 400,
        }
      )
    }

    const data = await guestyRequest('/reservations?limit=1&sort=-createdAt')
    const reservations = Array.isArray(data)
      ? data
      : data.results ?? data.reservations ?? data.data ?? []
    const booking = normalizeReservation(reservations[0] ?? null)

    return Response.json({
      connected: true,
      answer: buildAssistantReply(question, booking),
      booking,
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
