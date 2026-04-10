/* global process */

import { getCachedReservationSnapshot, getLatestReservation } from './_lib/guesty.js'
const DEFAULT_OPENAI_TIMEOUT_MS = 12000

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getDashboardSnapshot(dashboardContext) {
  if (!isRecord(dashboardContext)) {
    return {}
  }

  return isRecord(dashboardContext.dashboard) ? dashboardContext.dashboard : {}
}

function getLatestKnownBooking(booking, dashboardContext) {
  if (booking) {
    return booking
  }

  if (isRecord(dashboardContext) && isRecord(dashboardContext.latestBooking)) {
    return dashboardContext.latestBooking
  }

  return null
}

function formatList(items) {
  if (!items.length) {
    return ''
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function getReportById(dashboard, reportId) {
  const reports = Array.isArray(dashboard.reports) ? dashboard.reports : []
  return reports.find((report) => report.id === reportId) || null
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return []
  }

  return history
    .map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: cleanText(item?.content),
    }))
    .filter((item) => item.content)
    .slice(-12)
}

function buildConversationTranscript(history) {
  if (!history.length) {
    return ''
  }

  return history
    .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${item.content}`)
    .join('\n\n')
}

function buildCapabilitiesReply() {
  return 'I can help with dashboard analysis, bookings, revenue, issue spotting, writing support, summaries, and general questions. For live topics like weather, breaking news, or current events, I can only answer accurately when live lookup is available.'
}

function findRelevantListingName(question, booking, dashboardContext) {
  const lowerQuestion = question.toLowerCase()
  const recentBookings = Array.isArray(dashboardContext?.recentBookings)
    ? dashboardContext.recentBookings
    : []

  const matchedRecentBooking = recentBookings.find((item) => {
    const listingName = cleanText(item?.listingName || item?.property).toLowerCase()
    return listingName && lowerQuestion.includes(listingName)
  })

  if (matchedRecentBooking) {
    return matchedRecentBooking.listingName || matchedRecentBooking.property || ''
  }

  const bookingListing = cleanText(booking?.listingName)

  if (bookingListing && lowerQuestion.includes(bookingListing.toLowerCase())) {
    return bookingListing
  }

  return bookingListing
}

function buildPropertyInfoFallbackReply(question, booking, dashboardContext) {
  const lowerQuestion = question.toLowerCase()
  const listingName = findRelevantListingName(question, booking, dashboardContext) || 'that property'

  if (
    lowerQuestion.includes('wifi') ||
    lowerQuestion.includes('wi-fi') ||
    lowerQuestion.includes('internet') ||
    lowerQuestion.includes('password')
  ) {
    return `I do not see Wi-Fi details for ${listingName} in the dashboard or Guesty snapshot. If you want, I can help draft a guest message asking operations to confirm the correct network name and password.`
  }

  if (
    lowerQuestion.includes('link') ||
    lowerQuestion.includes('url') ||
    lowerQuestion.includes('website')
  ) {
    return `I do not have a saved link for ${listingName} in the current data. Tell me what kind of link you need, like check-in instructions, payment, house rules, or Wi-Fi info, and I can help draft the right reply.`
  }

  if (
    lowerQuestion.includes('address') ||
    lowerQuestion.includes('location') ||
    lowerQuestion.includes('door code') ||
    lowerQuestion.includes('check-in code')
  ) {
    return `I do not see that property access information for ${listingName} in the current dashboard data. If you want, I can help you write a message to the guest or to your ops team to confirm it.`
  }

  return ''
}

function buildUnknownQuestionReply(question, booking, dashboardContext) {
  const propertyInfoReply = buildPropertyInfoFallbackReply(question, booking, dashboardContext)

  if (propertyInfoReply) {
    return propertyInfoReply
  }

  return 'I do not have enough verified data to answer that properly from the current dashboard snapshot. Ask me about bookings, revenue, issues, property performance, or give me more detail and I will help as much as I can.'
}

function buildBookingSummary(booking) {
  if (!booking) {
    return 'Guesty is connected, but I could not find a recent reservation yet.'
  }

  return `Latest booking: ${booking.guestName} at ${booking.listingName}. Check-in ${booking.checkIn}, check-out ${booking.checkOut}, status ${booking.status}.`
}

function buildIssuesReply(dashboard) {
  const alerts = Array.isArray(dashboard.alerts) ? dashboard.alerts : []

  if (alerts.length) {
    const summaries = alerts
      .slice(0, 3)
      .map((alert) => `${alert.title}${alert.severity ? ` (${alert.severity})` : ''}`)

    return `The dashboard shows ${alerts.length} active issue${alerts.length > 1 ? 's' : ''}: ${formatList(summaries)}.`
  }

  const operations = isRecord(dashboard.operations) ? dashboard.operations : {}
  const checkIns = Array.isArray(operations.checkIns) ? operations.checkIns : []
  const checkOuts = Array.isArray(operations.checkOuts) ? operations.checkOuts : []

  if (!checkIns.length && !checkOuts.length) {
    return 'No active issues are surfaced in the current dashboard snapshot.'
  }

  return `No active alerts right now. Upcoming operations show ${checkIns.length} check-in${checkIns.length === 1 ? '' : 's'} and ${checkOuts.length} check-out${checkOuts.length === 1 ? '' : 's'} across today and tomorrow.`
}

function buildRevenueReply(lowerQuestion, dashboard, booking) {
  const dailyReport = getReportById(dashboard, 'daily')
  const weeklyReport = getReportById(dashboard, 'weekly')
  const monthlyReport = getReportById(dashboard, 'monthly')
  const financialSummary = isRecord(dashboard.financialSummary) ? dashboard.financialSummary : {}
  const todaySnapshot = isRecord(dashboard.todaySnapshot) ? dashboard.todaySnapshot : {}

  if (lowerQuestion.includes('week')) {
    if (weeklyReport) {
      return `This week the dashboard shows ${weeklyReport.revenue} in revenue and ${weeklyReport.expenses} in expenses. ${weeklyReport.note}`
    }
  }

  if (lowerQuestion.includes('month')) {
    if (monthlyReport) {
      return `Month to date, the dashboard shows ${monthlyReport.revenue} in revenue and ${monthlyReport.expenses} in expenses, with net at ${financialSummary.net || 'Last synced data'}. ${monthlyReport.note}`
    }
  }

  if (lowerQuestion.includes('today')) {
    if (dailyReport) {
      return `Today the dashboard shows ${dailyReport.revenue} in revenue and ${dailyReport.expenses} in expenses. ${dailyReport.note}`
    }

    if (todaySnapshot.revenue) {
      return `Today the dashboard shows ${todaySnapshot.revenue} in revenue across ${todaySnapshot.bookings || 0} booking${todaySnapshot.bookings === 1 ? '' : 's'}.`
    }
  }

  if (financialSummary.revenue || financialSummary.net) {
    return `Current dashboard totals show ${financialSummary.revenue || 'Last synced data'} in revenue, ${financialSummary.expenses || 'Last synced data'} in expenses, and ${financialSummary.net || 'Last synced data'} net.`
  }

  if (booking) {
    const amount =
      booking.totalPrice != null ? `${booking.currency} ${booking.totalPrice}` : 'an unknown amount'
    return `The latest reservation for ${booking.guestName} at ${booking.listingName} is recorded for ${amount}.`
  }

  return 'Revenue is not available in the current dashboard snapshot yet.'
}

function buildUnderperformingReply(dashboard) {
  const lowProperty = isRecord(dashboard.portfolio) ? dashboard.portfolio.lowProperty : null

  if (lowProperty && lowProperty.property) {
    return `${lowProperty.property} is currently the lowest performer at ${lowProperty.revenue || 'Last synced data'} this week across ${lowProperty.bookings || 0} booking${lowProperty.bookings === 1 ? '' : 's'}.`
  }

  const breakdown = isRecord(dashboard.profitSummary) ? dashboard.profitSummary.breakdown : null
  const lowestNetRow = Array.isArray(breakdown) ? breakdown[breakdown.length - 1] : null

  if (lowestNetRow && lowestNetRow.property) {
    return `${lowestNetRow.property} currently has the weakest net result at ${lowestNetRow.net || 'Last synced data'}.`
  }

  return 'I do not have enough property performance data to name an underperformer yet.'
}

function buildSnapshotReply(dashboard, booking) {
  const financialSummary = isRecord(dashboard.financialSummary) ? dashboard.financialSummary : {}
  const alerts = Array.isArray(dashboard.alerts) ? dashboard.alerts : []
  const topProperty = isRecord(dashboard.portfolio) ? dashboard.portfolio.topProperty : null
  const summaryParts = []

  if (financialSummary.revenue) {
    summaryParts.push(`${financialSummary.revenue} revenue`)
  }

  if (financialSummary.expenses) {
    summaryParts.push(`${financialSummary.expenses} expenses`)
  }

  if (financialSummary.net) {
    summaryParts.push(`${financialSummary.net} net`)
  }

  if (alerts.length) {
    summaryParts.push(`${alerts.length} active alert${alerts.length > 1 ? 's' : ''}`)
  }

  if (topProperty && topProperty.property) {
    summaryParts.push(`${topProperty.property} is leading this week`)
  }

  if (summaryParts.length) {
    return `Current dashboard snapshot: ${formatList(summaryParts)}.`
  }

  return buildBookingSummary(booking)
}

function buildLiveDataFallbackReply(question) {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes('weather')) {
    return 'I cannot verify live weather from the dashboard alone. If live lookup is enabled, I can answer current weather questions properly. Otherwise, tell me the city and I can help you phrase what to check or add live weather support to the app.'
  }

  if (
    lowerQuestion.includes('news') ||
    lowerQuestion.includes('latest') ||
    lowerQuestion.includes('current') ||
    lowerQuestion.includes('today')
  ) {
    return 'This looks like a live-information question. I can answer it well when live lookup is available, but I should not guess current facts without that access.'
  }

  return 'This question may need live information. I can help once live lookup is available, or I can still help with analysis, writing, and the dashboard data already in the app.'
}

function buildAssistantReply(question, booking, dashboardContext) {
  const latestBooking = getLatestKnownBooking(booking, dashboardContext)
  const dashboard = getDashboardSnapshot(dashboardContext)
  const lowerQuestion = question.toLowerCase()

  if (
    lowerQuestion.includes('hello') ||
    lowerQuestion.includes('hi') ||
    lowerQuestion.includes('hey') ||
    lowerQuestion.includes('what can you do') ||
    lowerQuestion.includes('help me')
  ) {
    return buildCapabilitiesReply()
  }

  if (
    lowerQuestion.includes('weather') ||
    lowerQuestion.includes('temperature') ||
    lowerQuestion.includes('forecast') ||
    lowerQuestion.includes('news')
  ) {
    return buildLiveDataFallbackReply(question)
  }

  if (!latestBooking && !Object.keys(dashboard).length) {
    return 'Guesty is connected, but I could not find a recent reservation yet.'
  }

  if (
    lowerQuestion.includes('issue') ||
    lowerQuestion.includes('alert') ||
    lowerQuestion.includes('problem') ||
    lowerQuestion.includes('wrong')
  ) {
    return buildIssuesReply(dashboard)
  }

  if (
    lowerQuestion.includes('underperform') ||
    lowerQuestion.includes('lowest') ||
    lowerQuestion.includes('weakest')
  ) {
    return buildUnderperformingReply(dashboard)
  }

  if (
    lowerQuestion.includes('price') ||
    lowerQuestion.includes('revenue') ||
    lowerQuestion.includes('amount') ||
    lowerQuestion.includes('make') ||
    lowerQuestion.includes('earn')
  ) {
    return buildRevenueReply(lowerQuestion, dashboard, latestBooking)
  }

  if (lowerQuestion.includes('latest') || lowerQuestion.includes('booking')) {
    return buildBookingSummary(latestBooking)
  }

  if (lowerQuestion.includes('arrival') || lowerQuestion.includes('check-in')) {
    if (latestBooking) {
      return `${latestBooking.guestName} is the latest reservation. Arrival is ${latestBooking.checkIn} at ${latestBooking.listingName}.`
    }

    return 'I do not have a current arrival record in the synced dashboard data.'
  }

  if (lowerQuestion.includes('deposit')) {
    if (latestBooking) {
      return `I can see the latest reservation for ${latestBooking.guestName}, but deposit status is not mapped from Guesty yet. We still need Stripe deposit integration on the backend.`
    }

    return 'Deposit status is not mapped from Guesty yet. We still need Stripe deposit integration on the backend.'
  }

  if (
    lowerQuestion.includes('wifi') ||
    lowerQuestion.includes('wi-fi') ||
    lowerQuestion.includes('internet') ||
    lowerQuestion.includes('password') ||
    lowerQuestion.includes('link') ||
    lowerQuestion.includes('url') ||
    lowerQuestion.includes('website') ||
    lowerQuestion.includes('address') ||
    lowerQuestion.includes('door code') ||
    lowerQuestion.includes('check-in code')
  ) {
    return buildUnknownQuestionReply(question, latestBooking, dashboardContext)
  }

  if (lowerQuestion.includes('?') || lowerQuestion.split(' ').length > 4) {
    return buildUnknownQuestionReply(question, latestBooking, dashboardContext)
  }

  return buildSnapshotReply(dashboard, latestBooking)
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

function shouldUseWebSearch(question) {
  const lowerQuestion = question.toLowerCase()
  const liveKeywords = [
    'weather',
    'temperature',
    'forecast',
    'today',
    'tonight',
    'tomorrow',
    'latest',
    'current',
    'right now',
    'now',
    'news',
    'score',
    'stock',
    'traffic',
    'time in',
  ]

  return liveKeywords.some((keyword) => lowerQuestion.includes(keyword))
}

function buildOpenAIInput(question, booking, dashboardContext, history, useThreading) {
  const currentSnapshot = `Current dashboard snapshot:\n${JSON.stringify(
    dashboardContext,
    null,
    2
  )}\n\nLatest Guesty booking data:\n${JSON.stringify(booking, null, 2)}`

  if (useThreading) {
    return `Admin question: ${question}\n\n${currentSnapshot}`
  }

  const transcript = buildConversationTranscript(history)

  return `Conversation so far:\n${transcript || `User: ${question}`}\n\n${currentSnapshot}`
}

async function askOpenAI(question, booking, dashboardContext, history, previousResponseId) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim()

  if (!apiKey) {
    return null
  }

  const model = String(process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini').trim() || 'gpt-5.4-mini'
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS) || DEFAULT_OPENAI_TIMEOUT_MS
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const normalizedHistory = normalizeHistory(history)
  const responseChainId = cleanText(previousResponseId)
  const useThreading = Boolean(responseChainId)
  const useLiveLookup = shouldUseWebSearch(question)

  let response

  try {
    async function createResponse(withWebSearch) {
      return fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          instructions:
            'You are the OneLuxStay AI assistant inside an admin dashboard. Be warm, clear, practical, and genuinely helpful. Use the dashboard and Guesty data when the question is about the business. You may also answer general knowledge, writing, brainstorming, and productivity questions in a ChatGPT-like way. For live topics such as weather, breaking news, current events, real-time traffic, or anything tied to today or right now, use live web lookup when it is available. If live verification is unavailable, say that clearly and do not guess. When the user refers to relative dates like today or tomorrow, be explicit about the date when useful. Never invent payment, deposit, or booking facts that are not present in the provided data.',
          input: buildOpenAIInput(
            question,
            booking,
            dashboardContext,
            normalizedHistory,
            useThreading
          ),
          previous_response_id: useThreading ? responseChainId : undefined,
          tools: withWebSearch ? [{ type: 'web_search' }] : undefined,
          max_output_tokens: 420,
        }),
        signal: controller.signal,
      })
    }

    response = await createResponse(useLiveLookup)

    if (!response.ok && useLiveLookup) {
      response = await createResponse(false)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const error = new Error('OpenAI is unavailable right now.')
    error.statusCode = response.status
    throw error
  }

  const data = await response.json()
  return {
    answer: getResponseText(data),
    responseId: cleanText(data.id) || null,
  }
}

export const handler = async (event) => {
  try {
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {}
    const question = String(body.question || '').trim()
    const dashboardContext = isRecord(body.dashboardContext) ? body.dashboardContext : null
    const history = normalizeHistory(body.history)
    const previousResponseId = cleanText(body.previousResponseId)

    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'A question is required.',
        }),
      }
    }

    let booking = null
    let guestyError = ''

    try {
      booking = await getLatestReservation()
    } catch (error) {
      guestyError = error.message
      booking =
        getCachedReservationSnapshot().booking ||
        (isRecord(dashboardContext?.latestBooking) ? dashboardContext.latestBooking : null)
    }

    let aiAnswer = null
    let responseId = null
    let usedFallback = Boolean(guestyError)

    try {
      const result = await askOpenAI(question, booking, dashboardContext, history, previousResponseId)
      aiAnswer = result?.answer || null
      responseId = result?.responseId || null
      usedFallback = !aiAnswer
    } catch {
      usedFallback = true
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: true,
        answer: aiAnswer || buildAssistantReply(question, booking, dashboardContext),
        booking,
        guestyError: guestyError || null,
        responseId,
        usedFallback,
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
