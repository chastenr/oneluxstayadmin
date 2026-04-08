import {
  CalendarIcon,
  DashboardIcon,
  DepositIcon,
  GuestsIcon,
  OperationsIcon,
  PaymentIcon,
  PropertyIcon,
  ReportsIcon,
  ReservationIcon,
  SettingsIcon,
} from './icons.jsx'

export const adminNavigation = [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { key: 'reservations', label: 'Reservations', icon: ReservationIcon },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'properties', label: 'Properties', icon: PropertyIcon },
  { key: 'guests', label: 'Guests', icon: GuestsIcon },
  { key: 'payments', label: 'Payments', icon: PaymentIcon },
  { key: 'deposits', label: 'Deposits', icon: DepositIcon },
  { key: 'operations', label: 'Operations', icon: OperationsIcon },
  { key: 'reports', label: 'Reports', icon: ReportsIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
]

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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

function getReservationTone(status) {
  const value = String(status || '').toLowerCase()

  if (value.includes('confirmed') || value.includes('reserved')) {
    return 'success'
  }

  if (value.includes('cancel') || value.includes('failed')) {
    return 'danger'
  }

  if (value.includes('inquiry') || value.includes('pending')) {
    return 'warning'
  }

  return 'neutral'
}

function buildLiveReservation(booking) {
  if (!booking) {
    return null
  }

  return {
    id: booking.id || 'live-booking',
    label: 'Live booking',
    source: booking.source || 'Guesty',
    guest: booking.guestName || 'Unknown guest',
    guestEmail: booking.guestEmail || 'Not available yet',
    property: booking.listingName || 'Unknown property',
    status: booking.status || 'Unknown',
    statusTone: getReservationTone(booking.status),
    checkIn: booking.checkIn || '',
    checkOut: booking.checkOut || '',
    amountValue: typeof booking.totalPrice === 'number' ? booking.totalPrice : null,
    amount: formatCurrency(booking.totalPrice, booking.currency || 'USD'),
    confirmation: booking.confirmationCode || 'Not available yet',
    channel: booking.source || 'Guesty',
    paymentStatus: 'Pending review',
    paymentTone: 'warning',
    depositStatus: 'Not mapped',
    depositTone: 'neutral',
    note: 'Synced from the latest Guesty reservation.',
    isLive: true,
  }
}

function createPreviewCalendarRows(liveReservation) {
  const focusProperty = liveReservation?.property || 'Primary property'
  const focusLabel = liveReservation ? `${liveReservation.guest}` : 'Awaiting live booking'

  return [
    {
      id: 'calendar-live',
      property: focusProperty,
      blocks: liveReservation
        ? [{ id: `${liveReservation.id}-stay`, label: focusLabel, day: 2, tone: 'accent' }]
        : [{ id: 'calendar-empty', label: 'No live block yet', day: 3, tone: 'neutral' }],
    },
    {
      id: 'calendar-hollywood',
      property: 'Hollywood Suites',
      blocks: [{ id: 'hold-hollywood', label: 'Owner hold', day: 4, tone: 'warning' }],
    },
    {
      id: 'calendar-beverly',
      property: 'Beverly Grove Loft',
      blocks: [{ id: 'cleaning-beverly', label: 'Cleaning block', day: 1, tone: 'neutral' }],
    },
  ].map((row) => ({
    ...row,
    days: dayLabels,
  }))
}

export function buildAdminData(booking, bookingError) {
  const liveReservation = buildLiveReservation(booking)
  const reservations = liveReservation ? [liveReservation] : []

  const alerts = []

  if (bookingError) {
    alerts.push({
      id: 'guesty-error',
      title: 'Guesty sync needs attention',
      description: bookingError,
      tone: 'danger',
    })
  } else if (!liveReservation) {
    alerts.push({
      id: 'sync-pending',
      title: 'Reservation sync is waiting for data',
      description: 'I don’t have that data available yet.',
      tone: 'warning',
    })
  }

  alerts.push({
    id: 'deposits',
    title: 'Deposits are not mapped yet',
    description: 'Capture and release actions are ready in the UI but still need payment wiring.',
    tone: 'warning',
  })

  alerts.push({
    id: 'reports',
    title: 'Revenue rollups need more sources',
    description: 'Weekly and monthly summaries will improve once payments and occupancy data are connected.',
    tone: 'info',
  })

  const kpis = [
    {
      label: 'Revenue',
      value: liveReservation?.amount || 'No data yet',
      hint: liveReservation
        ? 'Based on the latest synced reservation total.'
        : 'I don’t have that data available yet.',
      trend: liveReservation ? 'Latest sync' : 'Waiting',
      tone: 'accent',
    },
    {
      label: 'Occupancy',
      value: liveReservation ? 'Live feed' : '--',
      hint: liveReservation
        ? 'Calendar occupancy appears once multi-day availability is connected.'
        : 'Availability sync has not been connected yet.',
      trend: 'Pending',
    },
    {
      label: 'Bookings',
      value: liveReservation ? '1' : '0',
      hint: liveReservation
        ? 'The newest reservation is already available in the feed.'
        : 'No reservation has been returned yet.',
      trend: liveReservation ? 'Connected' : 'Waiting',
    },
    {
      label: 'Active Guests',
      value: liveReservation ? '1' : '0',
      hint: liveReservation
        ? `Tracking ${liveReservation.guest}.`
        : 'Guest summaries will appear here when bookings sync in.',
      trend: liveReservation ? 'Live guest' : 'Pending',
    },
  ]

  const upcoming = liveReservation
    ? [
        {
          id: 'check-in',
          label: 'Check-in',
          title: liveReservation.guest,
          meta: `${formatDate(liveReservation.checkIn)} at ${liveReservation.property}`,
        },
        {
          id: 'check-out',
          label: 'Check-out',
          title: liveReservation.guest,
          meta: `${formatDate(liveReservation.checkOut)} from ${liveReservation.property}`,
        },
      ]
    : [
        {
          id: 'upcoming-empty',
          label: 'Check-in',
          title: 'No arrivals synced yet',
          meta: 'I don’t have that data available yet.',
        },
      ]

  const payments = liveReservation
    ? [
        {
          id: `payment-${liveReservation.id}`,
          guest: liveReservation.guest,
          property: liveReservation.property,
          status: liveReservation.paymentStatus,
          statusTone: liveReservation.paymentTone,
          amount: liveReservation.amount,
          room: liveReservation.amount,
          taxes: 'Not available yet',
          fees: 'Not available yet',
          deposit: liveReservation.depositStatus,
          note: 'Payment breakdown beyond the reservation total is not mapped yet.',
        },
      ]
    : []

  const deposits = liveReservation
    ? [
        {
          id: `deposit-${liveReservation.id}`,
          guest: liveReservation.guest,
          property: liveReservation.property,
          status: liveReservation.depositStatus,
          statusTone: liveReservation.depositTone,
          amount: liveReservation.amount,
          lastUpdated: 'Awaiting payment integration',
        },
      ]
    : []

  const properties = liveReservation
    ? [
        {
          id: `property-${liveReservation.id}`,
          name: liveReservation.property,
          status: 'Receiving bookings',
          statusTone: 'success',
          note: `Latest synced guest: ${liveReservation.guest}`,
        },
      ]
    : [
        {
          id: 'property-placeholder',
          name: 'Properties will populate here',
          status: 'Waiting on sync',
          statusTone: 'warning',
          note: 'Connect more listing and calendar sources to populate this area.',
        },
      ]

  const guests = liveReservation
    ? [
        {
          id: `guest-${liveReservation.id}`,
          name: liveReservation.guest,
          email: liveReservation.guestEmail,
          note: `Currently booked at ${liveReservation.property}.`,
        },
      ]
    : []

  const operationsTasks = liveReservation
    ? [
        {
          id: `task-${liveReservation.id}-arrival`,
          title: `Prepare arrival for ${liveReservation.guest}`,
          property: liveReservation.property,
          assignee: 'Front desk',
          due: formatDate(liveReservation.checkIn),
          status: 'In progress',
        },
        {
          id: `task-${liveReservation.id}-checkout`,
          title: `Queue turnover after checkout`,
          property: liveReservation.property,
          assignee: 'Housekeeping',
          due: formatDate(liveReservation.checkOut),
          status: 'Planned',
        },
      ]
    : [
        {
          id: 'task-empty',
          title: 'Operations tasks will appear here',
          property: 'No property yet',
          assignee: 'Unassigned',
          due: 'Not available yet',
          status: 'Planned',
        },
      ]

  const reports = [
    {
      id: 'weekly-revenue',
      title: 'Weekly revenue',
      value: liveReservation?.amount || 'No data yet',
      note: 'Full weekly rollups need payment history and multi-booking sync.',
    },
    {
      id: 'occupancy-trend',
      title: 'Occupancy trend',
      value: 'I don’t have that data available yet.',
      note: 'Calendar sync will unlock property-level occupancy reporting.',
    },
    {
      id: 'risk-monitor',
      title: 'Risk monitor',
      value: alerts.length ? `${alerts.length} items` : 'Clear',
      note: 'Alerts combine sync issues, missing payment mapping, and data gaps.',
    },
  ]

  const settingsGroups = [
    {
      id: 'integrations',
      title: 'Integrations',
      items: [
        { label: 'Guesty reservation feed', value: liveReservation ? 'Connected' : 'Waiting' },
        { label: 'Assistant endpoint', value: 'Connected' },
        { label: 'Deposits and payment capture', value: 'Needs mapping' },
      ],
    },
    {
      id: 'access',
      title: 'Access and roles',
      items: [
        { label: 'Admin roles', value: 'Enabled' },
        { label: 'Super admin account creation', value: 'Enabled' },
        { label: 'Activity exports', value: 'Coming soon' },
      ],
    },
  ]

  return {
    kpis,
    reservations,
    payments,
    deposits,
    guests,
    properties,
    operationsTasks,
    reports,
    alerts,
    upcoming,
    calendarRows: createPreviewCalendarRows(liveReservation),
    depositLogs: [
      {
        id: 'log-1',
        action: 'Workspace initialized',
        meta: 'Deposit actions will log here once payment events are connected.',
      },
    ],
    settingsGroups,
  }
}
