import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'
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

const fieldClasses =
  'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition duration-200 placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-200/60'
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800'
const buttonSecondaryClasses =
  'inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:text-stone-950'

const assistantPrompts = [
  'How many bookings today?',
  'What issues need attention?',
  'Give me a weekly revenue summary.',
]

const sectionContent = {
  dashboard: {
    eyebrow: 'Executive overview',
    title: 'A simple control center for bookings, revenue, and risks.',
    description:
      'This dashboard summarizes hotel performance without trying to act like a full PMS.',
  },
  bookings: {
    eyebrow: 'Bookings summary',
    title: 'Latest synced bookings with clear status signals.',
    description:
      'Focus on the newest reservations and their review status instead of operational workflow detail.',
  },
  expenses: {
    eyebrow: 'Expense tracker',
    title: 'Track costs in a clean, executive-friendly view.',
    description:
      'Add expenses by category and keep an immediate breakdown of what is reducing profitability.',
  },
  profit: {
    eyebrow: 'Profit view',
    title: 'Revenue minus expenses, with a simple per-property breakdown.',
    description:
      'Net profit stays easy to read, and the dashboard is honest when data is still missing.',
  },
  reports: {
    eyebrow: 'Reports',
    title: 'Daily, weekly, and monthly summaries at a glance.',
    description:
      'Short summaries keep the focus on decision-making rather than cluttered reporting screens.',
  },
  assistant: {
    eyebrow: 'AI assistant',
    title: 'Ask quick questions about bookings, revenue, and issues.',
    description:
      'Responses stay concise and grounded in the synced Guesty data that is actually available.',
  },
}

function createEmptyExpenseForm(defaultProperty = '') {
  return {
    property: defaultProperty,
    category: expenseCategories[0],
    amount: '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    throw new Error('The server returned an empty response.')
  }

  try {
    return JSON.parse(text)
  } catch {
    if (text.startsWith('<!doctype html') || text.startsWith('<html')) {
      throw new Error(
        'The function is not running on this URL yet. If you are testing locally, use Netlify Dev or deploy the site first.'
      )
    }

    throw new Error(text)
  }
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, supabase, isSuperAdmin, role } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [assistantError, setAssistantError] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [bookingError, setBookingError] = useState('')
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
      setBookingError('')

      try {
        const response = await fetch(`${apiBase}/guesty-latest-booking`)
        const data = await readJsonResponse(response)

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to load the dashboard summary.')
        }

        if (!isMounted) {
          return
        }

        setLatestBooking(data.booking ?? null)
        setRecentBookings(Array.isArray(data.recentBookings) ? data.recentBookings : [])
        setExpenseForm((current) =>
          current.property ? current : createEmptyExpenseForm(data.booking?.listingName || '')
        )
      } catch (error) {
        if (!isMounted) {
          return
        }

        setLatestBooking(null)
        setRecentBookings([])
        setBookingError(error.message)
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

  const dashboardData = buildExecutiveDashboardData(recentBookings, bookingError, expenses)
  const pageMeta = sectionContent[activeSection]
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredBookings = dashboardData.bookingSummary.filter((row) =>
    `${row.guestName || row.guest} ${row.property} ${row.confirmationCode || row.confirmation} ${row.source}`
      .toLowerCase()
      .includes(normalizedSearch)
  )
  const filteredExpenses = dashboardData.expenseSummary.recentExpenses.filter((expense) =>
    `${expense.property} ${expense.category} ${expense.note}`.toLowerCase().includes(normalizedSearch)
  )
  const filteredProfitRows = dashboardData.profitSummary.breakdown.filter((row) =>
    `${row.property} ${row.revenue} ${row.expenses} ${row.net}`.toLowerCase().includes(normalizedSearch)
  )
  const notificationsCount = dashboardData.dashboardCards.alerts.length

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

      const data = await readJsonResponse(response)

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

    if (!expenseForm.property.trim() || !expenseForm.category || !Number.isFinite(amountValue) || amountValue <= 0) {
      return
    }

    setExpenses((current) => [
      {
        id: `expense-${Date.now()}`,
        property: expenseForm.property.trim(),
        category: expenseForm.category,
        amountValue,
        amount: formatCurrency(amountValue),
        note: expenseForm.note.trim() || 'No note',
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
              Executive view
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
          {adminNavigation.map((item) => {
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

  function renderDashboardSection() {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-none bg-stone-950 p-6 text-white shadow-panel">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <Badge tone="accent" className="bg-white/10 text-stone-100">
                Minimal executive dashboard
              </Badge>
              <div className="space-y-3">
                <h3 className="max-w-2xl text-3xl font-medium tracking-tight">
                  Revenue, bookings, costs, and issues in one calm view.
                </h3>
                <p className="max-w-2xl text-sm text-stone-300">
                  This is not a full PMS. It is a lightweight control center for executives who
                  need a quick operational readout.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className={buttonSecondaryClasses} to="/bookings/latest">
                  Live Guesty feed
                </Link>
                <button
                  type="button"
                  className={buttonPrimaryClasses}
                  onClick={() => setActiveSection('assistant')}
                >
                  Ask assistant
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-inner">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Upcoming check-ins
                </p>
                <p className="mt-3 text-3xl font-medium tracking-tight">
                  {dashboardData.dashboardCards.upcomingCheckIns.length}
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  {dashboardData.dashboardCards.upcomingCheckIns[0]
                    ? `${dashboardData.dashboardCards.upcomingCheckIns[0].guestName} on ${formatDate(
                        dashboardData.dashboardCards.upcomingCheckIns[0].checkIn
                      )}`
                    : 'No upcoming check-ins yet.'}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-inner">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Upcoming check-outs
                </p>
                <p className="mt-3 text-3xl font-medium tracking-tight">
                  {dashboardData.dashboardCards.upcomingCheckOuts.length}
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  {dashboardData.dashboardCards.upcomingCheckOuts[0]
                    ? `${dashboardData.dashboardCards.upcomingCheckOuts[0].guestName} on ${formatDate(
                        dashboardData.dashboardCards.upcomingCheckOuts[0].checkOut
                      )}`
                    : 'No upcoming check-outs yet.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
          {dashboardData.heroStats.map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.hint}
              tone={item.tone}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-6">
            <SectionHeader
              eyebrow="Latest bookings"
              title="Most recent booking summary"
              description="Only the latest synced bookings appear here, keeping the overview fast and readable."
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
                    key: 'guest',
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
                        <p className="mt-1 text-xs text-stone-400">{row.confirmationCode}</p>
                      </div>
                    ),
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
                rows={dashboardData.bookingSummary.slice(0, 5)}
                onRowClick={setSelectedBooking}
                emptyTitle="No bookings have been synced yet."
                emptyDescription="The executive dashboard will populate as soon as Guesty returns reservation history."
              />
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-6">
              <SectionHeader
                eyebrow="Alerts"
                title="What needs attention"
                description="Only meaningful issues and data gaps are surfaced here."
              />
              <div className="mt-6 space-y-3">
                {dashboardData.dashboardCards.alerts.length ? (
                  dashboardData.dashboardCards.alerts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-900">{item.title}</p>
                          <p className="mt-2 text-sm text-stone-500">{item.description}</p>
                        </div>
                        <Badge tone={item.tone}>{item.tone}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">No alerts right now.</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeader
                eyebrow="Profit snapshot"
                title="Current net view"
                description="Revenue minus expenses using the synced booking data and tracked expenses below."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['Revenue', dashboardData.profitSummary.revenue],
                  ['Expenses', dashboardData.profitSummary.expenses],
                  ['Net profit', dashboardData.profitSummary.net],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                      {label}
                    </p>
                    <p className="mt-3 text-2xl font-medium tracking-tight text-stone-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  function renderBookingsSection() {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Bookings summary"
          title="Latest 10 bookings"
          description="This view stays simple: guest, property, stay dates, synced status, and amount."
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
                key: 'stay',
                label: 'Stay',
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
            emptyTitle="No bookings match the current search."
            emptyDescription="Try clearing the search or wait for the next Guesty sync."
          />
        </div>
      </Card>
    )
  }

  function renderExpensesSection() {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6">
          <SectionHeader
            eyebrow="Add expense"
            title="Track operating costs"
            description="Keep this lightweight: property, category, amount, note, and date."
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
                placeholder="Cleaning invoice, utility bill, repair..."
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
          <Card className="p-6">
            <SectionHeader
              eyebrow="Expense totals"
              title="Breakdown by category"
              description="A clean view of where operating costs are going."
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

          <Card className="p-6">
            <SectionHeader
              eyebrow="Recent expenses"
              title="Latest tracked costs"
              description="Keep the list short and easy to scan."
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
                  title="No expenses yet."
                  description="Add cleaning, maintenance, utility, or supply costs to start tracking profitability."
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  function renderProfitSection() {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard
            label="Synced revenue"
            value={dashboardData.profitSummary.revenue}
            hint="Based on the current cached Guesty booking history."
            tone="accent"
          />
          <MetricCard
            label="Tracked expenses"
            value={dashboardData.profitSummary.expenses}
            hint="Pulled from the lightweight expense tracker."
          />
          <MetricCard
            label="Net profit"
            value={dashboardData.profitSummary.net}
            hint="Revenue minus expenses."
          />
        </div>

        <Card className="p-6">
          <SectionHeader
            eyebrow="Per property"
            title="Profit breakdown by property"
            description="This keeps the executive view focused on profitability, not operations workflows."
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
              emptyTitle="No property profit data yet."
              emptyDescription="Sync bookings and add expenses to populate the property breakdown."
            />
          </div>
        </Card>
      </div>
    )
  }

  function renderReportsSection() {
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Bookings</p>
                <p className="text-sm font-medium text-stone-900">{report.bookings}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-500">{report.note}</p>
          </Card>
        ))}
      </div>
    )
  }

  function renderAssistantSection() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_0.86fr]">
        <Card className="p-6">
          <SectionHeader
            eyebrow="AI assistant"
            title="Ask about revenue, bookings, and issues"
            description="Answers stay short, clear, and grounded in the synced Guesty data."
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
              placeholder="Ask about revenue, bookings, alerts, or issues..."
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
                Runs through <code>{`${apiBase}/guesty-assistant`}</code>
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
            description="This keeps the assistant transparent about the data currently available."
          />
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm font-medium text-stone-900">Latest booking</p>
              <p className="mt-2 text-sm text-stone-500">
                {latestBooking
                  ? `${latestBooking.guestName} at ${latestBooking.listingName}, ${formatDate(
                      latestBooking.checkIn
                    )} to ${formatDate(latestBooking.checkOut)}`
                  : 'I don’t have that data available yet.'}
              </p>
            </div>
            <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm font-medium text-stone-900">Revenue context</p>
              <p className="mt-2 text-sm text-stone-500">
                Synced booking revenue: {dashboardData.profitSummary.revenue}
              </p>
            </div>
            <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <p className="text-sm font-medium text-stone-900">Expense context</p>
              <p className="mt-2 text-sm text-stone-500">
                Tracked expenses: {dashboardData.profitSummary.expenses}
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
      case 'profit':
        return renderProfitSection()
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
                  <div className="relative min-w-0 flex-1 xl:w-[420px]">
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
                  <button type="button" className={buttonSecondaryClasses}>
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Executive filters
                  </button>
                  <IconButton>
                    <div className="relative">
                      <BellIcon className="h-4 w-4" />
                      {notificationsCount ? (
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-950 px-1 text-[10px] font-medium text-white">
                          {notificationsCount}
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
                      <p className="text-sm text-stone-500">
                        {role === 'superadmin' ? 'Super admin' : 'Admin'}
                      </p>
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
                  <Badge tone={summaryLoading ? 'warning' : bookingError ? 'danger' : 'success'}>
                    {summaryLoading ? 'Loading Guesty' : bookingError ? 'Sync issue' : 'Guesty live'}
                  </Badge>
                  <Link className={buttonSecondaryClasses} to="/bookings/latest">
                    Latest feed
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
          selectedBooking
            ? `${selectedBooking.property} • ${selectedBooking.confirmationCode}`
            : ''
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
