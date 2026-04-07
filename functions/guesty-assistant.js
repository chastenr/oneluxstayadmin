const { getLatestReservation } = require('./_lib/guesty')

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

  if (
    lowerQuestion.includes('price') ||
    lowerQuestion.includes('revenue') ||
    lowerQuestion.includes('amount')
  ) {
    return `The latest reservation for ${booking.guestName} at ${booking.listingName} is recorded for ${amount}.`
  }

  return `Latest reservation I found: ${booking.guestName} at ${booking.listingName}, ${booking.checkIn} to ${booking.checkOut}, status ${booking.status}.`
}

function getResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  const output = Array.isArray(data.output) ? data.output : []

  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : []

    for (const part of content) {
      if (part.type === 'output_text' && typeof part.text === 'string' && part.text.trim()) {
        return part.text.trim()
      }
    }
  }

  return ''
}

async function askOpenAI(question, booking) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-5-mini'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions:
        'You are the OneLuxStay internal operations assistant. Answer using only the Guesty booking data provided. Be concise, operational, and honest. If the data is missing, say that it is not available yet. Do not invent deposit or payment status unless explicitly provided.',
      input: `Admin question: ${question}\n\nLatest Guesty booking data:\n${JSON.stringify(
        booking,
        null,
        2
      )}`,
      max_output_tokens: 220,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return getResponseText(data)
}

exports.handler = async (event) => {
  try {
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {}
    const question = String(body.question || '').trim()

    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'A question is required.',
        }),
      }
    }

    const booking = await getLatestReservation()
    const aiAnswer = await askOpenAI(question, booking)

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: true,
        answer: aiAnswer || buildAssistantReply(question, booking),
        booking,
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
