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
  { key: 'profit', label: 'Profit', icon: ReportsIcon },
  { key: 'reports', label: 'Reports', icon: ReportsIcon },
  { key: 'assistant', label: 'AI Assistant', icon: SparklesIcon },
]

export const expenseCategories = [
  'Cleaning',
  'Maintenance',
  'Utilities',
  'Supplies',
  'Other',
]

function toDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getPeriodStart(period) {
  const now = new Date()

  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  if (period === 'week') {
    const day = now.getDay()
    const diff = (day + 6) % 7
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
  }

  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function isInPeriod(value, period) {
  const parsed = toDate(value)

  if (!parsed) {
    return false
  }

  return parsed >= getPeriodStart(period)
}

function isUpcoming(value) {
  const parsed = toDate(value)

  if (!parsed) {
    return false
  }

  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return parsed >= startToday
}

export function formatDate(value, options = {}) {
  const parsed = toDate(value)

  if (!parsed) {
    return 'Not available yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(parsed)
}

export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'No data yet'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase()

  if (value.includes('failed') || value.includes('cancel')) {
    return { label: 'Failed', tone: 'danger' }
  }

  if (value.includes('confirmed') || value.includes('reserved')) {
    return { label: 'Pending', tone: 'warning' }
  }

  return { label: 'Pending', tone: 'neutral' }
}

function sumAmount(rows) {
  return rows.reduce((total, row) => total + (typeof row.amountValue === 'number' ? row.amountValue : 0), 0)
}

function buildExpenseBreakdown(expenses) {
  return expenseCategories.map((category) => {
    const rows = expenses.filter((expense) => expense.category === category)

    return {
      category,
      totalValue: sumAmount(rows),
      total: formatCurrency(sumAmount(rows)),
      count: rows.length,
    }
  })
}

function buildProfitBreakdown(bookings, expenses) {
  const propertyNames = [...new Set([...bookings.map((row) => row.property), ...expenses.map((row) => row.property)])]

  return propertyNames.map((property) => {
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
}

export function buildExecutiveDashboardData(bookings, bookingError, expenses) {
  const safeBookings = Array.isArray(bookings) ? bookings : []
  const safeExpenses = Array.isArray(expenses) ? expenses : []
  const upcomingCheckIns = safeBookings.filter((row) => isUpcoming(row.checkIn)).slice(0, 5)
  const upcomingCheckOuts = safeBookings.filter((row) => isUpcoming(row.checkOut)).slice(0, 5)
  const revenueTodayValue = sumAmount(safeBookings.filter((row) => isInPeriod(row.createdAt, 'today')))
  const revenueWeekValue = sumAmount(safeBookings.filter((row) => isInPeriod(row.createdAt, 'week')))
  const revenueMonthValue = sumAmount(safeBookings.filter((row) => isInPeriod(row.createdAt, 'month')))
  const bookingsToday = safeBookings.filter((row) => isInPeriod(row.createdAt, 'today')).length
  const bookingsWeek = safeBookings.filter((row) => isInPeriod(row.createdAt, 'week')).length
  const bookingsMonth = safeBookings.filter((row) => isInPeriod(row.createdAt, 'month')).length
  const expensesTodayValue = sumAmount(safeExpenses.filter((row) => isInPeriod(row.date, 'today')))
  const expensesWeekValue = sumAmount(safeExpenses.filter((row) => isInPeriod(row.date, 'week')))
  const expensesMonthValue = sumAmount(safeExpenses.filter((row) => isInPeriod(row.date, 'month')))
  const totalRevenueValue = sumAmount(safeBookings)
  const totalExpensesValue = sumAmount(safeExpenses)
  const netProfitValue = totalRevenueValue - totalExpensesValue
  const failedItems = safeBookings.filter((row) => normalizeStatus(row.status).label === 'Failed').length
  const alerts = []

  if (bookingError) {
    alerts.push({
      id: 'guesty-error',
      title: 'Guesty sync needs attention',
      description: bookingError,
      tone: 'danger',
    })
  }

  if (failedItems) {
    alerts.push({
      id: 'failed-bookings',
      title: `${failedItems} booking${failedItems > 1 ? 's' : ''} need review`,
      description: 'Some synced reservation statuses look failed or canceled.',
      tone: 'warning',
    })
  }

  if (!safeBookings.length) {
    alerts.push({
      id: 'booking-gap',
      title: 'No booking history available yet',
      description: 'I don’t have that data available yet.',
      tone: 'info',
    })
  }

  if (!safeExpenses.length) {
    alerts.push({
      id: 'expense-gap',
      title: 'No expenses have been added yet',
      description: 'Add cleaning, maintenance, and utility costs to unlock profit reporting.',
      tone: 'info',
    })
  }

  const bookingSummary = safeBookings.slice(0, 10).map((row) => {
    const paymentState = normalizeStatus(row.status)

    return {
      ...row,
      paymentLabel: paymentState.label,
      paymentTone: paymentState.tone,
    }
  })

  const expenseBreakdown = buildExpenseBreakdown(safeExpenses)
  const profitBreakdown = buildProfitBreakdown(safeBookings, safeExpenses)

  return {
    heroStats: [
      {
        label: 'Revenue today',
        value: formatCurrency(revenueTodayValue),
        hint: bookingsToday ? `${bookingsToday} booking sync${bookingsToday > 1 ? 's' : ''} today` : 'No synced bookings today',
        tone: 'accent',
      },
      {
        label: 'Revenue this week',
        value: formatCurrency(revenueWeekValue),
        hint: bookingsWeek ? `${bookingsWeek} booking sync${bookingsWeek > 1 ? 's' : ''} this week` : 'No synced bookings this week',
      },
      {
        label: 'Revenue this month',
        value: formatCurrency(revenueMonthValue),
        hint: bookingsMonth ? `${bookingsMonth} booking sync${bookingsMonth > 1 ? 's' : ''} this month` : 'No synced bookings this month',
      },
      {
        label: 'Bookings',
        value: String(safeBookings.length),
        hint: safeBookings.length ? 'Using the latest synced reservation history.' : 'Waiting on Guesty booking history.',
      },
      {
        label: 'Occupancy rate',
        value: 'No data yet',
        hint: 'Property availability is not connected, so occupancy stays honest here.',
      },
      {
        label: 'Alerts',
        value: String(alerts.length),
        hint: alerts.length ? 'Failed syncs or data gaps requiring attention.' : 'No alerts right now.',
      },
    ],
    dashboardCards: {
      upcomingCheckIns,
      upcomingCheckOuts,
      alerts,
    },
    bookingSummary,
    expenseSummary: {
      totalValue: totalExpensesValue,
      total: formatCurrency(totalExpensesValue),
      breakdown: expenseBreakdown,
      recentExpenses: [...safeExpenses]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, 8),
    },
    profitSummary: {
      revenueValue: totalRevenueValue,
      revenue: formatCurrency(totalRevenueValue),
      expensesValue: totalExpensesValue,
      expenses: formatCurrency(totalExpensesValue),
      netValue: netProfitValue,
      net: formatCurrency(netProfitValue),
      breakdown: profitBreakdown,
    },
    reports: [
      {
        id: 'daily',
        title: 'Daily summary',
        revenue: formatCurrency(revenueTodayValue),
        expenses: formatCurrency(expensesTodayValue),
        bookings: bookingsToday,
        note: alerts.length ? `${alerts.length} alerts need review.` : 'No major issues flagged today.',
      },
      {
        id: 'weekly',
        title: 'Weekly summary',
        revenue: formatCurrency(revenueWeekValue),
        expenses: formatCurrency(expensesWeekValue),
        bookings: bookingsWeek,
        note: safeExpenses.length ? 'Expense entries are included in this weekly rollup.' : 'Add expenses to improve this report.',
      },
      {
        id: 'monthly',
        title: 'Monthly summary',
        revenue: formatCurrency(revenueMonthValue),
        expenses: formatCurrency(expensesMonthValue),
        bookings: bookingsMonth,
        note: safeBookings.length ? 'Based on the most recently synced bookings.' : 'I don’t have that data available yet.',
      },
    ],
  }
}
