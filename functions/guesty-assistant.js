/* global process */

import { getLatestReservation } from './_lib/guesty.js'
const DEFAULT_OPENAI_TIMEOUT_MS = 12000

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
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

function buildAssistantReply(question, booking, dashboardContext) {
  const latestBooking = getLatestKnownBooking(booking, dashboardContext)
  const dashboard = getDashboardSnapshot(dashboardContext)

  if (!latestBooking && !Object.keys(dashboard).length) {
    return 'Guesty is connected, but I could not find a recent reservation yet.'
  }

  const lowerQuestion = question.toLowerCase()

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

async function askOpenAI(question, booking, dashboardContext) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim()

  if (!apiKey) {
    return null
  }

  const model = String(process.env.OPENAI_CHAT_MODEL || 'gpt-5-mini').trim() || 'gpt-5-mini'
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS) || DEFAULT_OPENAI_TIMEOUT_MS
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions:
          'You are the OneLuxStay internal operations assistant. Answer using only the dashboard and Guesty data provided. Be concise, operational, and honest. If the data is missing, say that it is not available yet. Do not invent deposit or payment status unless explicitly provided.',
        input: `Admin question: ${question}\n\nCurrent dashboard snapshot:\n${JSON.stringify(
          dashboardContext,
          null,
          2
        )}\n\nLatest Guesty booking data:\n${JSON.stringify(
          booking,
          null,
          2
        )}`,
        max_output_tokens: 220,
      }),
      signal: controller.signal,
    })
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
  return getResponseText(data)
}

export const handler = async (event) => {
  try {
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {}
    const question = String(body.question || '').trim()
    const dashboardContext = isRecord(body.dashboardContext) ? body.dashboardContext : null

    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'A question is required.',
        }),
      }
    }

    const booking = await getLatestReservation()
    let aiAnswer = null
    let usedFallback = false

    try {
      aiAnswer = await askOpenAI(question, booking, dashboardContext)
    } catch {
      usedFallback = true
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        connected: true,
        answer: aiAnswer || buildAssistantReply(question, booking, dashboardContext),
        booking,
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
