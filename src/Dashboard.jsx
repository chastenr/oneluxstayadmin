import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'
import { fetchGuestySummary } from './lib/guestySummary.js'
import {
  adminNavigation,
  buildExecutiveDashboardData,
  expenseCategories,
  formatCurrency,
  formatDate,
} from './components/admin/dashboardData.js'
import {
  ArrowUpRightIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FilterIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  SparklesIcon,
} from './components/admin/icons.jsx'
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  MetricCard,
  SectionHeader,
  SlideOver,
} from './components/admin/ui.jsx'
import { cx } from './components/admin/utils.js'

const apiBase = import.meta.env.VITE_API_BASE || '/.netlify/functions'
const expenseStorageKey = 'oneluxstay-admin-expenses'
const summaryStorageKey = 'oneluxstay-executive-summary'

const fieldClasses =
  'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition duration-200 placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-200/60'
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800'
const buttonSecondaryClasses =
  'inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:text-stone-950'

const assistantPrompts = [
  'How much did we make this week?',
  'Which property is underperforming?',
  'Any issues today?',
]

const sectionContent = {
  dashboard: {
    eyebrow: 'Today snapshot',
    title: 'Business performance in under ten seconds.',
    description:
      'A lightweight executive control center for OneLuxStay, built to summarize revenue, bookings, alerts, and operations without recreating Guesty.',
  },
  bookings: {
    eyebrow: 'Latest bookings',
    title: 'Recent reservations with clear status signals.',
    description:
      'A short bookings summary that stays readable and useful without turning into deep booking management.',
  },
  expenses: {
    eyebrow: 'Expense tracker',
    title: 'Track costs that shape profit.',
    description:
      'Executives can add simple operating costs and immediately see their effect on the business.',
  },
  reports: {
    eyebrow: 'Reports',
    title: 'Short summaries for daily, weekly, and monthly review.',
    description:
      'Reports stay concise, readable, and focused on decision-making rather than operational detail.',
  },
  assistant: {
    eyebrow: 'AI assistant',
    title: 'Ask direct questions about revenue, bookings, and issues.',
    description:
      'The assistant uses summarized system data and stays honest when something is missing.',
  },
}

const executiveOnlySections = new Set(['expenses', 'reports'])

function createEmptyExpenseForm(defaultProperty = '') {
  return {
    property: defaultProperty,
    category: expenseCategories[0],
    amount: '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function addDays(value, days) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function isWithinRange(value, range) {
  if (range === 'all') {
    return true
  }

  const parsed = value ? new Date(value) : null

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return false
  }

  const today = startOfToday()

  if (range === 'today') {
    return parsed >= today && parsed < addDays(today, 1)
  }

  if (range === 'week') {
    const day = today.getDay()
    const diff = (day + 6) % 7
    return parsed >= addDays(today, -diff)
  }

  if (range === 'month') {
    return parsed >= new Date(today.getFullYear(), today.getMonth(), 1)
  }

  return true
}

function readCachedSummary() {
  try {
    const raw = window.localStorage.getItem(summaryStorageKey)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)

    if (!parsed || !Array.isArray(parsed.recentBookings)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function saveCachedSummary(summary) {
  window.localStorage.setItem(summaryStorageKey, JSON.stringify(summary))
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, supabase, isSuperAdmin } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState('week')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [assistantError, setAssistantError] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [syncState, setSyncState] = useState('issue')
  const [syncError, setSyncError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [latestBooking, setLatestBooking] = useState(null)
  const [recentBookings, setRecentBookings] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [expenseForm, setExpenseForm] = useState(createEmptyExpenseForm())

  useEffect(() => {
    try {
      const storedExpenses = window.localStorage.getItem(expenseStorageKey)

      if (!storedExpenses) {
        return
      }

      const parsedExpenses = JSON.parse(storedExpenses)

      if (Array.isArray(parsedExpenses)) {
        setExpenses(parsedExpenses)
      }
    } catch {
      setExpenses([])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(expenseStorageKey, JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    let isMounted = true

    async function loadSummary() {
      setSummaryLoading(true)
      setSyncError('')

      try {
        const data = await fetchGuestySummary()

        if (!isMounted) {
          return
        }

        const syncedAt = new Date().toISOString()
        setLatestBooking(data.booking ?? null)
        setRecentBookings(Array.isArray(data.recentBookings) ? data.recentBookings : [])
        setLastSyncedAt(syncedAt)
        setSyncState('live')
        setExpenseForm((current) =>
          current.property ? current : createEmptyExpenseForm(data.booking?.listingName || '')
        )
        saveCachedSummary({
          booking: data.booking ?? null,
          recentBookings: Array.isArray(data.recentBookings) ? data.recentBookings : [],
          syncedAt,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        const cachedSummary = readCachedSummary()

        if (cachedSummary) {
          setLatestBooking(cachedSummary.booking ?? null)
          setRecentBookings(cachedSummary.recentBookings ?? [])
          setLastSyncedAt(cachedSummary.syncedAt || null)
          setSyncState('cached')
          setSyncError('')
        } else {
          setLatestBooking(null)
          setRecentBookings([])
          setLastSyncedAt(null)
          setSyncState('issue')
          setSyncError(error.message)
        }
      } finally {
        if (isMounted) {
          setSummaryLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      isMounted = false
    }
  }, [])

  const roleLabel = isSuperAdmin ? 'Executive' : 'Admin'
  const navigationItems = isSuperAdmin
    ? adminNavigation
    : adminNavigation.filter((item) => !executiveOnlySections.has(item.key))
  const propertyOptions = useMemo(() => {
    return [
      ...new Set(
        [...recentBookings.map((row) => row.listingName || row.property), ...expenses.map((row) => row.property)]
          .filter(Boolean)
      ),
    ]
  }, [recentBookings, expenses])

  const scopedBookings = recentBookings.filter((row) => {
    const matchesProperty =
      propertyFilter === 'all' || (row.listingName || row.property) === propertyFilter
    const matchesRange = isWithinRange(row.createdAt, dateRange)
    return matchesProperty && matchesRange
  })
  const scopedExpenses = expenses.filter((row) => {
    const matchesProperty = propertyFilter === 'all' || row.property === propertyFilter
    const matchesRange = isWithinRange(row.date, dateRange)
    return matchesProperty && matchesRange
  })

  const dashboardData = buildExecutiveDashboardData(
    scopedBookings.map((row) => ({
      ...row,
      property: row.listingName || row.property,
      amountValue: typeof row.amountValue === 'number' ? row.amountValue : row.totalPrice,
      amount: row.amount || formatCurrency(row.totalPrice, row.currency || 'USD'),
    })),
    syncState === 'issue' ? syncError : '',
    scopedExpenses,
    {
      syncState,
      lastSyncedAt,
    }
  )

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredBookings = dashboardData.bookingSummary.filter((row) =>
    `${row.guestName} ${row.property} ${row.confirmationCode} ${row.source}`
      .toLowerCase()
      .includes(normalizedSearch)
  )
  const filteredExpenses = dashboardData.expenseSummary.recentExpenses.filter((expense) =>
    `${expense.property} ${expense.category} ${expense.note}`.toLowerCase().includes(normalizedSearch)
  )
  const filteredProfitRows = dashboardData.profitSummary.breakdown.filter((row) =>
    `${row.property} ${row.revenue} ${row.expenses} ${row.net}`.toLowerCase().includes(normalizedSearch)
  )
  const pageMeta = sectionContent[activeSection] || sectionContent.dashboard

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  async function askAssistant(customQuestion) {
    const finalQuestion = String(customQuestion ?? question).trim()

    if (!finalQuestion) {
      setAssistantError('Type a question first.')
      return
    }

    setAssistantLoading(true)
    setAssistantError('')
    setAnswer('')
    setQuestion(finalQuestion)

    try {
      const response = await fetch(`${apiBase}/guesty-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: finalQuestion }),
      })

      const text = await response.text()
      let data

      if (!text) {
        throw new Error('The server returned an empty response.')
      }

      try {
        data = JSON.parse(text)
      } catch {
        if (text.startsWith('<!doctype html') || text.startsWith('<html')) {
          throw new Error(
            'The function is not running on this URL yet. If you are testing locally, use Netlify Dev or deploy the site first.'
          )
        }

        throw new Error(text)
      }

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to reach the assistant.')
      }

      setAnswer(data.answer ?? 'No answer returned.')
    } catch (error) {
      setAssistantError(error.message)
    } finally {
      setAssistantLoading(false)
    }
  }

  function handleExpenseInput(field, value) {
    setExpenseForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleAddExpense(event) {
    event.preventDefault()

    const amountValue = Number(expenseForm.amount)

    if (
      !expenseForm.property.trim() ||
      !expenseForm.category ||
      !Number.isFinite(amountValue) ||
      amountValue <= 0
    ) {
      return
    }

    setExpenses((current) => [
      {
        id: `expense-${Date.now()}`,
        property: expenseForm.property.trim(),
        category: expenseForm.category,
        amountValue,
        amount: formatCurrency(amountValue),
        note: expenseForm.note.trim() || 'Recorded manually',
        date: expenseForm.date,
      },
      ...current,
    ])

    setExpenseForm(createEmptyExpenseForm(expenseForm.property.trim()))
  }

  function handleDeleteExpense(expenseId) {
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId))
  }

  function renderSidebar(isMobile = false) {
    return (
      <Card
        className={cx(
          'flex h-full flex-col bg-white/92 p-4',
          sidebarCollapsed && !isMobile ? 'w-[92px]' : 'w-full lg:w-[280px]'
        )}
      >
        <div className="flex items-center justify-between gap-3 px-2 py-3">
          <div className={cx('min-w-0', sidebarCollapsed && !isMobile ? 'hidden' : 'block')}>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-stone-400">
              OneLuxStay
            </p>
            <h1 className="mt-2 text-xl font-medium tracking-tight text-stone-950">
              Executive dashboard
            </h1>
          </div>
          <IconButton
            className={cx(!sidebarCollapsed || isMobile ? '' : 'mx-auto')}
            onClick={() =>
              isMobile ? setMobileSidebarOpen(false) : setSidebarCollapsed((current) => !current)
            }
          >
            {isMobile ? (
              <CloseIcon className="h-4 w-4" />
            ) : sidebarCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </IconButton>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.key

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveSection(item.key)
                  setMobileSidebarOpen(false)
                }}
                className={cx(
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition duration-200',
                  isActive
                    ? 'bg-stone-950 text-white shadow-sm'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-950',
                  sidebarCollapsed && !isMobile ? 'justify-center px-0' : ''
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cx(sidebarCollapsed && !isMobile ? 'hidden' : 'block')}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="space-y-3 border-t border-stone-200/80 px-2 pt-4">
          {isSuperAdmin && (!sidebarCollapsed || isMobile) ? (
            <Link className={buttonSecondaryClasses} to="/signup">
              Create account
            </Link>
          ) : null}
          <button
            type="button"
            className={cx(
              'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-stone-500 transition duration-200 hover:bg-stone-100 hover:text-stone-950',
              sidebarCollapsed && !isMobile ? 'justify-center px-0' : ''
            )}
            onClick={handleSignOut}
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span className={cx(sidebarCollapsed && !isMobile ? 'hidden' : 'block')}>
              Sign out
            </span>
          </button>
        </div>
      </Card>
    )
  }

  function renderTodaySnapshot() {
    return (
      <Card className="overflow-hidden border-none bg-stone-950 p-6 text-white shadow-panel">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <Badge tone="accent" className="bg-white/10 text-stone-100">
                Today snapshot
              </Badge>
              <div className="space-y-2">
                <h3 className="text-3xl font-medium tracking-tight md:text-4xl">
                  High-level performance, without the Guesty clutter.
                </h3>
                <p className="max-w-2xl text-sm text-stone-300">{dashboardData.sync.detail}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge tone={dashboardData.sync.tone}>{dashboardData.sync.label}</Badge>
              <Link className={buttonSecondaryClasses} to="/bookings/latest">
                Latest feed
                <ArrowUpRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Revenue today', dashboardData.todaySnapshot.revenue],
              ['Bookings today', String(dashboardData.todaySnapshot.bookings)],
              ['Check-ins today', String(dashboardData.todaySnapshot.checkIns)],
              ['Active alerts', String(dashboardData.todaySnapshot.alerts)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-inner"
              >
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  {label}
                </p>
                <p className="mt-4 text-4xl font-medium tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  function renderPortfolioPerformance() {
    if (!dashboardData.portfolio.topProperty && !dashboardData.portfolio.occupancyTrend.length) {
      return null
    }

    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Portfolio performance"
          title="Top property, lowest performer, and last 7 days"
          description="Keep performance simple and readable instead of opening a full reporting system."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
          {dashboardData.portfolio.topProperty ? (
            <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Top performing property
              </p>
              <h3 className="mt-3 text-2xl font-medium tracking-tight text-stone-950">
                {dashboardData.portfolio.topProperty.property}
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                {dashboardData.portfolio.topProperty.revenue} this week
              </p>
            </div>
          ) : null}

          {dashboardData.portfolio.lowProperty ? (
            <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Lowest performing property
              </p>
              <h3 className="mt-3 text-2xl font-medium tracking-tight text-stone-950">
                {dashboardData.portfolio.lowProperty.property}
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                {dashboardData.portfolio.lowProperty.revenue} this week
              </p>
            </div>
          ) : null}

          {dashboardData.portfolio.occupancyTrend.length ? (
            <div className="rounded-[24px] border border-stone-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Occupancy trend
              </p>
              <div className="mt-6 flex items-end gap-3">
                {dashboardData.portfolio.occupancyTrend.map((point) => (
                  <div key={point.day} className="flex flex-1 flex-col items-center gap-3">
                    <div className="flex h-28 w-full items-end rounded-2xl bg-stone-100 px-2 py-2">
                      <div
                        className="w-full rounded-xl bg-stone-950 transition-all duration-200"
                        style={{ height: `${Math.max(point.percent, 8)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-stone-900">{point.percent}%</p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                        {point.day}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-stone-500">Based on last synced stay data.</p>
            </div>
          ) : null}
        </div>
      </Card>
    )
  }

  function renderFinancialSummary() {
    if (!isSuperAdmin) {
      return null
    }

    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Financial summary"
          title="Month-to-date revenue, expenses, and net profit"
          description="A replacement for quick spreadsheet checks and manual summaries."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Revenue"
            value={dashboardData.financialSummary.revenue}
            hint="Month-to-date"
            tone="accent"
          />
          <MetricCard
            label="Expenses"
            value={dashboardData.financialSummary.expenses}
            hint="Month-to-date"
          />
          <MetricCard
            label="Net profit"
            value={dashboardData.financialSummary.net}
            hint="Revenue minus expenses"
          />
        </div>
      </Card>
    )
  }

  function renderAlertsPanel() {
    if (!dashboardData.alerts.length) {
      return null
    }

    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Alerts"
          title="Actionable issues only"
          description="Short, clear, and focused on what actually needs attention."
        />
        <div className="mt-6 space-y-3">
          {dashboardData.alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900">{alert.title}</p>
                  <p className="mt-2 text-sm text-stone-500">{alert.description}</p>
                </div>
                <Badge tone={alert.tone}>{alert.severity}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  function renderUpcomingOperations() {
    const hasOperations =
      dashboardData.operations.checkIns.length ||
      dashboardData.operations.checkOuts.length ||
      dashboardData.operations.cleaningTasks.length

    if (!hasOperations) {
      return null
    }

    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Upcoming operations"
          title="Next arrivals, departures, and turnovers"
          description="Only the next useful operational actions appear here."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {dashboardData.operations.checkIns.length ? (
            <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Next check-ins
              </p>
              <div className="mt-4 space-y-3">
                {dashboardData.operations.checkIns.map((item) => (
                  <div key={item.id}>
                    <p className="font-medium text-stone-900">{item.guestName}</p>
                    <p className="text-sm text-stone-500">
                      {item.property} • {formatDate(item.checkIn)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {dashboardData.operations.checkOuts.length ? (
            <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Upcoming check-outs
              </p>
              <div className="mt-4 space-y-3">
                {dashboardData.operations.checkOuts.map((item) => (
                  <div key={item.id}>
                    <p className="font-medium text-stone-900">{item.guestName}</p>
                    <p className="text-sm text-stone-500">
                      {item.property} • {formatDate(item.checkOut)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {dashboardData.operations.cleaningTasks.length ? (
            <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Cleaning tasks
              </p>
              <div className="mt-4 space-y-3">
                {dashboardData.operations.cleaningTasks.map((item) => (
                  <div key={item.id}>
                    <p className="font-medium text-stone-900">{item.property}</p>
                    <p className="text-sm text-stone-500">
                      {item.label} • {formatDate(item.due)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    )
  }

  function renderLatestBookings() {
    if (!dashboardData.latestBookings.length) {
      return null
    }

    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Latest bookings"
          title="Last five reservations"
          description="Only the newest bookings are shown here, keeping the view fast and readable."
          action={
            <button
              type="button"
              className={buttonSecondaryClasses}
              onClick={() => setActiveSection('bookings')}
            >
              Open bookings
            </button>
          }
        />
        <div className="mt-6">
          <DataTable
            columns={[
              {
                key: 'guestName',
                label: 'Guest',
                render: (row) => (
                  <div>
                    <p className="font-medium text-stone-900">{row.guestName}</p>
                    <p className="mt-1 text-xs text-stone-400">{row.guestEmail}</p>
                  </div>
                ),
              },
              {
                key: 'property',
                label: 'Property',
                render: (row) => (
                  <div>
                    <p className="font-medium text-stone-900">{row.property}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {formatDate(row.checkIn)} to {formatDate(row.checkOut)}
                    </p>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <Badge tone={row.paymentTone}>{row.paymentLabel}</Badge>,
              },
            ]}
            rows={dashboardData.latestBookings}
            onRowClick={setSelectedBooking}
            emptyTitle="Last synced data unavailable for bookings."
            emptyDescription="Try a different filter or refresh the summary."
          />
        </div>
      </Card>
    )
  }

  function renderDashboardSection() {
    return (
      <div className="space-y-6">
        {renderTodaySnapshot()}
        {renderPortfolioPerformance()}
        {renderFinancialSummary()}
        {renderAlertsPanel()}
        {renderUpcomingOperations()}
        {renderLatestBookings()}
      </div>
    )
  }

  function renderBookingsSection() {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Bookings summary"
          title="Latest 10 bookings"
          description="A short reservation summary for executives and admins who need quick visibility."
        />
        <div className="mt-6">
          <DataTable
            columns={[
              {
                key: 'guestName',
                label: 'Guest',
                render: (row) => (
                  <div>
                    <p className="font-medium text-stone-900">{row.guestName}</p>
                    <p className="mt-1 text-xs text-stone-400">{row.guestEmail}</p>
                  </div>
                ),
              },
              {
                key: 'property',
                label: 'Property',
                render: (row) => (
                  <div>
                    <p className="font-medium text-stone-900">{row.property}</p>
                    <p className="mt-1 text-xs text-stone-400">{row.source}</p>
                  </div>
                ),
              },
              {
                key: 'dates',
                label: 'Dates',
                render: (row) => `${formatDate(row.checkIn)} to ${formatDate(row.checkOut)}`,
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <Badge tone={row.paymentTone}>{row.paymentLabel}</Badge>,
              },
              {
                key: 'amount',
                label: 'Amount',
                className: 'font-medium text-stone-900',
                render: (row) => row.amount,
              },
            ]}
            rows={filteredBookings}
            onRowClick={setSelectedBooking}
            emptyTitle="Last synced booking data is not available for this filter."
            emptyDescription="Try another property or date range."
          />
        </div>
      </Card>
    )
  }

  function renderExpensesSection() {
    if (!isSuperAdmin) {
      return null
    }

    return (
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6">
          <SectionHeader
            eyebrow="Expense tracker"
            title="Add simple operating costs"
            description="Keep expenses lightweight: property, category, amount, note, and date."
          />
          <form className="mt-6 space-y-4" onSubmit={handleAddExpense}>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Property
              </span>
              <input
                className={fieldClasses}
                value={expenseForm.property}
                onChange={(event) => handleExpenseInput('property', event.target.value)}
                placeholder={latestBooking?.listingName || 'Property name'}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Category
                </span>
                <select
                  className={fieldClasses}
                  value={expenseForm.category}
                  onChange={(event) => handleExpenseInput('category', event.target.value)}
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Amount
                </span>
                <input
                  className={fieldClasses}
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(event) => handleExpenseInput('amount', event.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Note
              </span>
              <input
                className={fieldClasses}
                value={expenseForm.note}
                onChange={(event) => handleExpenseInput('note', event.target.value)}
                placeholder="Cleaning invoice, repair, bill..."
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Date
              </span>
              <input
                className={fieldClasses}
                type="date"
                value={expenseForm.date}
                onChange={(event) => handleExpenseInput('date', event.target.value)}
              />
            </label>
            <button type="submit" className={buttonPrimaryClasses}>
              Add expense
            </button>
          </form>
        </Card>

        <div className="grid gap-6">
          {dashboardData.expenseSummary.breakdown.length ? (
            <Card className="p-6">
              <SectionHeader
                eyebrow="Expense totals"
                title="Cost breakdown"
                description="A quick summary of where month-to-date costs are going."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {dashboardData.expenseSummary.breakdown.map((item) => (
                  <div
                    key={item.category}
                    className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4"
                  >
                    <p className="text-sm font-medium text-stone-900">{item.category}</p>
                    <p className="mt-3 text-2xl font-medium tracking-tight text-stone-950">
                      {item.total}
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      {item.count} expense{item.count === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-6">
            <SectionHeader
              eyebrow="Recent expenses"
              title="Latest tracked costs"
              description="These rows stay short and searchable so the section remains useful."
            />
            <div className="mt-6 space-y-3">
              {filteredExpenses.length ? (
                filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex flex-col gap-4 rounded-[22px] border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{expense.property}</p>
                      <p className="mt-2 text-sm text-stone-500">
                        {expense.category} • {expense.note}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">{formatDate(expense.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-stone-900">{expense.amount}</p>
                      <button
                        type="button"
                        className={buttonSecondaryClasses}
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Last synced expense data is unavailable for this filter."
                  description="Try a wider date range or add a new expense entry."
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  function renderReportsSection() {
    if (!isSuperAdmin) {
      return null
    }

    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {dashboardData.reports.map((report) => (
          <Card key={report.id} className="p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              {report.title}
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Revenue</p>
                <p className="text-sm font-medium text-stone-900">{report.revenue}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Expenses</p>
                <p className="text-sm font-medium text-stone-900">{report.expenses}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-500">{report.note}</p>
          </Card>
        ))}

        {filteredProfitRows.length ? (
          <Card className="p-6 xl:col-span-3">
            <SectionHeader
              eyebrow="Per property"
              title="Property profit breakdown"
              description="A simple per-property look at revenue, expenses, and net result."
            />
            <div className="mt-6">
              <DataTable
                columns={[
                  {
                    key: 'property',
                    label: 'Property',
                    className: 'font-medium text-stone-900',
                  },
                  { key: 'revenue', label: 'Revenue' },
                  { key: 'expenses', label: 'Expenses' },
                  { key: 'net', label: 'Net profit', className: 'font-medium text-stone-900' },
                ]}
                rows={filteredProfitRows}
                emptyTitle="Last synced profit data is unavailable for this filter."
              />
            </div>
          </Card>
        ) : null}
      </div>
    )
  }

  function renderAssistantSection() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_0.86fr]">
        <Card className="p-6">
          <SectionHeader
            eyebrow="AI assistant"
            title="Ask direct questions about the business"
            description="Use the assistant for quick summaries, underperformance checks, and issue spotting."
          />
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {assistantPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className={buttonSecondaryClasses}
                  onClick={() => askAssistant(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              rows="5"
              className={fieldClasses}
              placeholder="Ask about revenue, issues, or property performance..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={buttonPrimaryClasses}
                onClick={() => askAssistant()}
              >
                {assistantLoading ? 'Sending...' : 'Send question'}
              </button>
              <p className="text-sm text-stone-500">
                Uses summarized data from the current executive dashboard.
              </p>
            </div>

            {answer ? (
              <div className="rounded-[24px] border border-stone-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Answer
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-700">{answer}</p>
              </div>
            ) : null}

            {assistantError ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {assistantError}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader
            eyebrow="Current context"
            title="What the assistant can see"
            description="Keep the assistant transparent about the exact data it is summarizing."
          />
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm font-medium text-stone-900">Sync status</p>
              <p className="mt-2 text-sm text-stone-500">{dashboardData.sync.detail}</p>
            </div>
            {latestBooking ? (
              <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-sm font-medium text-stone-900">Latest booking</p>
                <p className="mt-2 text-sm text-stone-500">
                  {latestBooking.guestName} at {latestBooking.listingName}, {formatDate(latestBooking.checkIn)} to{' '}
                  {formatDate(latestBooking.checkOut)}
                </p>
              </div>
            ) : null}
            <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm font-medium text-stone-900">Current financial view</p>
              <p className="mt-2 text-sm text-stone-500">
                Revenue {dashboardData.financialSummary.revenue} • Expenses {dashboardData.financialSummary.expenses} • Net {dashboardData.financialSummary.net}
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  function renderActiveSection() {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardSection()
      case 'bookings':
        return renderBookingsSection()
      case 'expenses':
        return renderExpensesSection()
      case 'reports':
        return renderReportsSection()
      case 'assistant':
        return renderAssistantSection()
      default:
        return renderDashboardSection()
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-stone-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_top_left,rgba(214,201,183,0.34),transparent_32%),radial-gradient(circle_at_top_right,rgba(196,210,224,0.28),transparent_28%)]" />

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-stone-950/30 p-4 lg:hidden">
          <div className="h-full max-w-sm">{renderSidebar(true)}</div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden lg:block">{renderSidebar()}</aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="sticky top-0 z-30 pt-2">
            <Card className="border-stone-200/70 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <IconButton className="lg:hidden" onClick={() => setMobileSidebarOpen(true)}>
                    <MenuIcon className="h-4 w-4" />
                  </IconButton>
                  <div className="relative min-w-0 flex-1 xl:w-[360px]">
                    <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      className={cx(fieldClasses, 'pl-11')}
                      placeholder="Search bookings, expenses, or properties"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className={fieldClasses}
                    value={dateRange}
                    onChange={(event) => setDateRange(event.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="all">All time</option>
                  </select>
                  <select
                    className={fieldClasses}
                    value={propertyFilter}
                    onChange={(event) => setPropertyFilter(event.target.value)}
                  >
                    <option value="all">All properties</option>
                    {propertyOptions.map((property) => (
                      <option key={property} value={property}>
                        {property}
                      </option>
                    ))}
                  </select>
                  <button type="button" className={buttonSecondaryClasses}>
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Executive filters
                  </button>
                  <IconButton>
                    <div className="relative">
                      <BellIcon className="h-4 w-4" />
                      {dashboardData.alerts.length ? (
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-950 px-1 text-[10px] font-medium text-white">
                          {dashboardData.alerts.length}
                        </span>
                      ) : null}
                    </div>
                  </IconButton>
                  <div className="flex items-center gap-3 rounded-[24px] border border-stone-200 bg-white px-4 py-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-sm font-medium text-white">
                      {String(user?.email || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {user?.email ?? 'Unknown user'}
                      </p>
                      <p className="text-sm text-stone-500">{roleLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </header>

          <section className="space-y-6 pb-10">
            <SectionHeader
              eyebrow={pageMeta.eyebrow}
              title={pageMeta.title}
              description={pageMeta.description}
              action={
                <div className="flex flex-wrap gap-3">
                  <Badge tone={summaryLoading ? 'warning' : dashboardData.sync.tone}>
                    {summaryLoading ? 'Loading summary' : dashboardData.sync.label}
                  </Badge>
                  <Link className={buttonSecondaryClasses} to="/bookings/latest">
                    Live booking feed
                    <ArrowUpRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              }
            />

            {renderActiveSection()}
          </section>
        </div>
      </div>

      <SlideOver
        open={!!selectedBooking}
        title={selectedBooking?.guestName || 'Booking details'}
        description={
          selectedBooking ? `${selectedBooking.property} • ${selectedBooking.confirmationCode}` : ''
        }
        onClose={() => setSelectedBooking(null)}
        footer={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonSecondaryClasses}
              onClick={() => setSelectedBooking(null)}
            >
              Close
            </button>
            <Link className={buttonPrimaryClasses} to="/bookings/latest">
              Open live feed
            </Link>
          </div>
        }
      >
        {selectedBooking ? (
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                    Guest
                  </p>
                  <h4 className="mt-2 text-xl font-medium tracking-tight text-stone-950">
                    {selectedBooking.guestName}
                  </h4>
                  <p className="mt-3 text-sm text-stone-500">{selectedBooking.guestEmail}</p>
                </div>
                <Badge tone={selectedBooking.paymentTone}>{selectedBooking.paymentLabel}</Badge>
              </div>
            </Card>

            <Card className="p-5">
              <div className="space-y-4">
                {[
                  ['Property', selectedBooking.property],
                  ['Source', selectedBooking.source],
                  ['Check-in', formatDate(selectedBooking.checkIn)],
                  ['Check-out', formatDate(selectedBooking.checkOut)],
                  ['Amount', selectedBooking.amount],
                  ['Confirmation', selectedBooking.confirmationCode],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-stone-700">{label}</p>
                    <p className="text-sm text-stone-500">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}
      </SlideOver>
    </main>
  )
}

export default Dashboard
