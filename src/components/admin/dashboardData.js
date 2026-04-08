import {
  DashboardIcon,
  PaymentIcon,
  ReportsIcon,
  ReservationIcon,
  SparklesIcon,
} from './icons.jsx'

export const adminNavigation = [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { key: 'bookings', label: 'Bookings', icon: ReservationIcon },
  { key: 'expenses', label: 'Expenses', icon: PaymentIcon },
  { key: 'reports', label: 'Reports', icon: ReportsIcon },
  { key: 'assistant', label: 'AI Assistant', icon: SparklesIcon },
]

export const expenseCategories = ['Cleaning', 'Maintenance', 'Utilities', 'Supplies', 'Other']

function toDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfWeek() {
  const today = startOfToday()
  const day = today.getDay()
  const diff = (day + 6) % 7
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff)
}

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function addDays(value, days) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function isWithinRange(value, range) {
  const parsed = toDate(value)

  if (!parsed || range === 'all') {
    return range === 'all' ? true : false
  }

  if (range === 'today') {
    const today = startOfToday()
    return parsed >= today && parsed < addDays(today, 1)
  }

  if (range === 'week') {
    return parsed >= startOfWeek()
  }

  if (range === 'month') {
    return parsed >= startOfMonth()
  }

  return true
}

function isCheckInToday(value) {
  const parsed = toDate(value)
  if (!parsed) {
    return false
  }

  const today = startOfToday()
  return parsed >= today && parsed < addDays(today, 1)
}

function isTodayOrTomorrow(value) {
  const parsed = toDate(value)
  if (!parsed) {
    return false
  }

  const today = startOfToday()
  return parsed >= today && parsed < addDays(today, 2)
}

function isActiveOnDate(booking, date) {
  const checkIn = toDate(booking.checkIn)
  const checkOut = toDate(booking.checkOut)

  if (!checkIn || !checkOut) {
    return false
  }

  return checkIn <= date && checkOut > date
}

export function formatDate(value, options = {}) {
  const parsed = toDate(value)

  if (!parsed) {
    return 'Last synced data'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(parsed)
}

export function formatDateTime(value) {
  const parsed = toDate(value)

  if (!parsed) {
    return 'Last synced data'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Last synced data'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function getSyncPresentation(syncState, lastSyncedAt) {
  if (syncState === 'live') {
    return {
      label: 'Guesty live',
      tone: 'success',
      detail: lastSyncedAt ? `Last synced ${formatDateTime(lastSyncedAt)}` : 'Live data',
    }
  }

  if (syncState === 'cached') {
    return {
      label: 'Last synced data',
      tone: 'warning',
      detail: lastSyncedAt ? `Using cached data from ${formatDateTime(lastSyncedAt)}` : 'Using cached data',
    }
  }

  return {
    label: 'Sync issue',
    tone: 'danger',
    detail: 'Guesty data is currently unavailable.',
  }
}

function normalizeBookingStatus(status) {
  const value = String(status || '').toLowerCase()

  if (value.includes('failed') || value.includes('cancel')) {
    return { label: 'Failed', tone: 'danger' }
  }

  if (value.includes('confirmed') || value.includes('paid')) {
    return { label: 'Paid', tone: 'success' }
  }

  return { label: 'Pending', tone: 'warning' }
}

function sumAmount(rows) {
  return rows.reduce(
    (total, row) => total + (typeof row.amountValue === 'number' ? row.amountValue : 0),
    0
  )
}

function buildExpenseBreakdown(expenses) {
  return expenseCategories
    .map((category) => {
      const rows = expenses.filter((expense) => expense.category === category)
      const totalValue = sumAmount(rows)

      return {
        category,
        totalValue,
        total: formatCurrency(totalValue),
        count: rows.length,
      }
    })
    .filter((item) => item.count > 0)
}

function buildPropertyPerformance(bookings) {
  const weekBookings = bookings.filter((row) => isWithinRange(row.createdAt, 'week'))
  const grouped = [...new Set(weekBookings.map((row) => row.property))]
    .map((property) => {
      const propertyBookings = weekBookings.filter((row) => row.property === property)
      const revenueValue = sumAmount(propertyBookings)
      return {
        property,
        revenueValue,
        revenue: formatCurrency(revenueValue),
        bookings: propertyBookings.length,
      }
    })
    .sort((left, right) => right.revenueValue - left.revenueValue)

  return {
    top: grouped[0] || null,
    low: grouped[grouped.length - 1] || null,
  }
}

function buildOccupancyTrend(bookings) {
  const properties = [...new Set(bookings.map((row) => row.property))].filter(Boolean)

  if (!properties.length || !bookings.length) {
    return []
  }

  const today = startOfToday()
  const points = []

  for (let index = 6; index >= 0; index -= 1) {
    const day = addDays(today, -index)
    const activeProperties = new Set(
      bookings.filter((row) => isActiveOnDate(row, day)).map((row) => row.property)
    )
    const percent = Math.round((activeProperties.size / properties.length) * 100)

    points.push({
      day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day),
      percent,
    })
  }

  return points
}

function buildAlerts({ bookings, bookingError, syncState, propertyPerformance }) {
  const alerts = []
  const failedBookings = bookings.filter(
    (row) => normalizeBookingStatus(row.status).label === 'Failed'
  )

  if (bookingError && syncState !== 'cached') {
    alerts.push({
      id: 'sync-failed',
      title: 'Failed Guesty sync',
      description: 'Review Guesty credentials or API limits and trigger a fresh sync.',
      tone: 'danger',
      severity: 'High',
    })
  }

  if (failedBookings.length) {
    alerts.push({
      id: 'payment-issues',
      title: `${failedBookings.length} payment issue${failedBookings.length > 1 ? 's' : ''}`,
      description: 'Review bookings with failed or canceled payment-related statuses.',
      tone: 'warning',
      severity: 'Medium',
    })
  }

  if (propertyPerformance.low && propertyPerformance.low.revenueValue === 0) {
    alerts.push({
      id: 'low-occupancy',
      title: 'Low occupancy warning',
      description: `${propertyPerformance.low.property} has no synced revenue this week.`,
      tone: 'warning',
      severity: 'Medium',
    })
  }

  if (!bookings.length) {
    alerts.push({
      id: 'missing-data',
      title: 'Missing booking data',
      description: 'Showing last synced data until Guesty history becomes available again.',
      tone: 'info',
      severity: 'Low',
    })
  }

  return alerts
}

function buildOperations(bookings) {
  const checkIns = bookings.filter((row) => isTodayOrTomorrow(row.checkIn)).slice(0, 4)
  const checkOuts = bookings.filter((row) => isTodayOrTomorrow(row.checkOut)).slice(0, 4)
  const cleaningTasks = checkOuts.map((row) => ({
    id: `clean-${row.id}`,
    property: row.property,
    due: row.checkOut,
    label: `Prepare ${row.property} after ${row.guestName} checkout`,
  }))

  return {
    checkIns,
    checkOuts,
    cleaningTasks,
  }
}

function buildProfitBreakdown(bookings, expenses) {
  return [...new Set([...bookings.map((row) => row.property), ...expenses.map((row) => row.property)])]
    .filter(Boolean)
    .map((property) => {
      const bookingRows = bookings.filter((row) => row.property === property)
      const expenseRows = expenses.filter((row) => row.property === property)
      const revenueValue = sumAmount(bookingRows)
      const expenseValue = sumAmount(expenseRows)
      const netValue = revenueValue - expenseValue

      return {
        property,
        revenueValue,
        expenseValue,
        netValue,
        revenue: formatCurrency(revenueValue),
        expenses: formatCurrency(expenseValue),
        net: formatCurrency(netValue),
      }
    })
    .sort((left, right) => right.netValue - left.netValue)
}

export function buildExecutiveDashboardData(bookings, bookingError, expenses, options = {}) {
  const safeBookings = Array.isArray(bookings) ? bookings : []
  const safeExpenses = Array.isArray(expenses) ? expenses : []
  const syncState = options.syncState || 'issue'
  const lastSyncedAt = options.lastSyncedAt || null
  const todayRevenueValue = sumAmount(safeBookings.filter((row) => isWithinRange(row.createdAt, 'today')))
  const todayBookings = safeBookings.filter((row) => isWithinRange(row.createdAt, 'today')).length
  const todayCheckIns = safeBookings.filter((row) => isCheckInToday(row.checkIn)).length
  const monthRevenueValue = sumAmount(safeBookings.filter((row) => isWithinRange(row.createdAt, 'month')))
  const monthExpenseValue = sumAmount(safeExpenses.filter((row) => isWithinRange(row.date, 'month')))
  const propertyPerformance = buildPropertyPerformance(safeBookings)
  const alerts = buildAlerts({
    bookings: safeBookings,
    bookingError,
    syncState,
    propertyPerformance,
  })
  const operations = buildOperations(safeBookings)
  const bookingSummary = safeBookings.slice(0, 10).map((row) => {
    const statusMeta = normalizeBookingStatus(row.status)

    return {
      ...row,
      paymentLabel: statusMeta.label,
      paymentTone: statusMeta.tone,
    }
  })

  const expenseBreakdown = buildExpenseBreakdown(safeExpenses)
  const profitBreakdown = buildProfitBreakdown(safeBookings, safeExpenses)
  const occupancyTrend = buildOccupancyTrend(safeBookings)
  const weeklyRevenueValue = sumAmount(safeBookings.filter((row) => isWithinRange(row.createdAt, 'week')))
  const weeklyExpenseValue = sumAmount(safeExpenses.filter((row) => isWithinRange(row.date, 'week')))

  return {
    sync: getSyncPresentation(syncState, lastSyncedAt),
    todaySnapshot: {
      revenueValue: todayRevenueValue,
      revenue: formatCurrency(todayRevenueValue),
      bookings: todayBookings,
      checkIns: todayCheckIns,
      alerts: alerts.length,
    },
    portfolio: {
      topProperty: propertyPerformance.top,
      lowProperty: propertyPerformance.low,
      occupancyTrend,
    },
    financialSummary: {
      revenueValue: monthRevenueValue,
      revenue: formatCurrency(monthRevenueValue),
      expensesValue: monthExpenseValue,
      expenses: formatCurrency(monthExpenseValue),
      netValue: monthRevenueValue - monthExpenseValue,
      net: formatCurrency(monthRevenueValue - monthExpenseValue),
    },
    alerts,
    operations,
    latestBookings: bookingSummary.slice(0, 5),
    bookingSummary,
    expenseSummary: {
      totalValue: sumAmount(safeExpenses),
      total: formatCurrency(sumAmount(safeExpenses)),
      breakdown: expenseBreakdown,
      recentExpenses: [...safeExpenses]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, 8),
    },
    profitSummary: {
      revenueValue: sumAmount(safeBookings),
      revenue: formatCurrency(sumAmount(safeBookings)),
      expensesValue: sumAmount(safeExpenses),
      expenses: formatCurrency(sumAmount(safeExpenses)),
      netValue: sumAmount(safeBookings) - sumAmount(safeExpenses),
      net: formatCurrency(sumAmount(safeBookings) - sumAmount(safeExpenses)),
      breakdown: profitBreakdown,
    },
    reports: [
      {
        id: 'daily',
        title: 'Daily summary',
        revenue: formatCurrency(todayRevenueValue),
        expenses: formatCurrency(sumAmount(safeExpenses.filter((row) => isWithinRange(row.date, 'today')))),
        note: alerts.length ? `${alerts.length} active alert${alerts.length > 1 ? 's' : ''}.` : 'Stable today.',
      },
      {
        id: 'weekly',
        title: 'Weekly summary',
        revenue: formatCurrency(weeklyRevenueValue),
        expenses: formatCurrency(weeklyExpenseValue),
        note: propertyPerformance.top ? `${propertyPerformance.top.property} leads this week.` : 'Last synced data.',
      },
      {
        id: 'monthly',
        title: 'Monthly summary',
        revenue: formatCurrency(monthRevenueValue),
        expenses: formatCurrency(monthExpenseValue),
        note: profitBreakdown.length ? `${profitBreakdown[0].property} has the strongest net result.` : 'Last synced data.',
      },
    ],
  }
}
