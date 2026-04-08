import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'
import { adminNavigation, buildAdminData, formatDate } from './components/admin/dashboardData.js'
import {
  ArrowUpRightIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
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

const assistantPrompts = [
  'How many bookings today?',
  'Any payment issues?',
  'Which guests are arriving next?',
]

const fieldClasses =
  'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition duration-200 placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-200/60'
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800'
const buttonSecondaryClasses =
  'inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:text-stone-950'

const sectionContent = {
  dashboard: {
    eyebrow: 'Operations overview',
    title: 'A calm command center for bookings, guests, and revenue.',
    description:
      'Use the live Guesty feed and the admin assistant to review reservations, surface issues, and keep operations moving.',
  },
  reservations: {
    eyebrow: 'Reservation desk',
    title: 'Filter reservations and open details from a single table.',
    description:
      'Use date, property, status, and source filters to narrow the queue before reviewing a booking in the side panel.',
  },
  calendar: {
    eyebrow: 'Calendar planning',
    title: 'Plan blocking across properties with a clean multi-property view.',
    description:
      'Drag a hold or stay block to another day or property to preview drag-and-drop scheduling.',
  },
  properties: {
    eyebrow: 'Portfolio',
    title: 'Keep every property status visible at a glance.',
    description:
      'Each property card highlights current booking visibility, sync quality, and readiness for operations.',
  },
  guests: {
    eyebrow: 'Guest roster',
    title: 'Track upcoming guests and their current stay context.',
    description: 'Guest cards surface the latest available guest information from synced reservations.',
  },
  payments: {
    eyebrow: 'Payments',
    title: 'Monitor transaction status and payment breakdowns.',
    description:
      'Status badges highlight whether payment mapping is ready, pending, or needs follow-up.',
  },
  deposits: {
    eyebrow: 'Deposits',
    title: 'Review capture and release actions with a live activity trail.',
    description:
      'Deposit actions are staged in the UI so the operations flow is ready once payment events are connected.',
  },
  operations: {
    eyebrow: 'Operations queue',
    title: 'Assign cleaning and maintenance tasks without leaving the dashboard.',
    description:
      'Operations tasks update inline so the team always has a clear next action for arrivals and turnovers.',
  },
  reports: {
    eyebrow: 'Reporting',
    title: 'Summaries stay concise, honest, and ready for decision-making.',
    description:
      'When data is missing, the dashboard says so clearly instead of inventing numbers.',
  },
  settings: {
    eyebrow: 'Workspace settings',
    title: 'Check connection status, roles, and workspace preferences.',
    description:
      'This keeps the admin panel transparent about which automations are active and which still need wiring.',
  },
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

function doesDateMatchFilter(value, filter) {
  if (filter === 'all') {
    return true
  }

  const parsed = value ? new Date(value) : null

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return filter === 'upcoming'
  }

  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = parsed.getTime() - startToday.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (filter === 'today') {
    return diffDays >= 0 && diffDays < 1
  }

  if (filter === 'next7') {
    return diffDays >= 0 && diffDays <= 7
  }

  if (filter === 'upcoming') {
    return diffDays >= 0
  }

  return true
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
  const [latestBooking, setLatestBooking] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(true)
  const [bookingError, setBookingError] = useState('')
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [reservationFilters, setReservationFilters] = useState({
    date: 'all',
    property: 'all',
    status: 'all',
    source: 'all',
  })
  const [depositRows, setDepositRows] = useState([])
  const [depositLogs, setDepositLogs] = useState([])
  const [operationsTasks, setOperationsTasks] = useState([])
  const [calendarRows, setCalendarRows] = useState([])
  const [draggedCalendarBlock, setDraggedCalendarBlock] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadLatestBooking() {
      setBookingLoading(true)
      setBookingError('')

      try {
        const response = await fetch(`${apiBase}/guesty-latest-booking`)
        const data = await readJsonResponse(response)

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to load the latest booking.')
        }

        if (!isMounted) {
          return
        }

        setLatestBooking(data.booking ?? null)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setLatestBooking(null)
        setBookingError(error.message)
      } finally {
        if (isMounted) {
          setBookingLoading(false)
        }
      }
    }

    loadLatestBooking()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const initialData = buildAdminData(latestBooking, bookingError)
    setDepositRows(initialData.deposits)
    setDepositLogs(initialData.depositLogs)
    setOperationsTasks(initialData.operationsTasks)
    setCalendarRows(initialData.calendarRows)
  }, [latestBooking, bookingError])

  const adminData = buildAdminData(latestBooking, bookingError)
  const pageMeta = sectionContent[activeSection]
  const reservationRows = adminData.reservations.filter((row) => {
    const matchesSearch = `${row.guest} ${row.property} ${row.source} ${row.confirmation}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())

    const matchesProperty =
      reservationFilters.property === 'all' || row.property === reservationFilters.property
    const matchesStatus =
      reservationFilters.status === 'all' || row.status === reservationFilters.status
    const matchesSource =
      reservationFilters.source === 'all' || row.source === reservationFilters.source
    const matchesDate = doesDateMatchFilter(row.checkIn, reservationFilters.date)

    return matchesSearch && matchesProperty && matchesStatus && matchesSource && matchesDate
  })

  const paymentRows = adminData.payments.filter((row) =>
    `${row.guest} ${row.property} ${row.status}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )
  const propertyRows = adminData.properties.filter((row) =>
    `${row.name} ${row.status} ${row.note}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )
  const guestRows = adminData.guests.filter((row) =>
    `${row.name} ${row.email} ${row.note}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )
  const alertRows =
    assistantError && !adminData.alerts.find((item) => item.id === 'assistant-error')
      ? [
          {
            id: 'assistant-error',
            title: 'Assistant needs attention',
            description: assistantError,
            tone: 'danger',
          },
          ...adminData.alerts,
        ]
      : adminData.alerts

  const propertyOptions = [...new Set(adminData.reservations.map((row) => row.property))]
  const statusOptions = [...new Set(adminData.reservations.map((row) => row.status))]
  const sourceOptions = [...new Set(adminData.reservations.map((row) => row.source))]
  const notificationsCount = alertRows.length

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

  function handleDepositAction(row, action) {
    setDepositRows((currentRows) =>
      currentRows.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: action === 'capture' ? 'Captured' : 'Released',
              statusTone: action === 'capture' ? 'danger' : 'success',
              lastUpdated: `${action === 'capture' ? 'Captured' : 'Released'} just now`,
            }
          : item
      )
    )

    setDepositLogs((currentLogs) => [
      {
        id: `${row.id}-${action}-${Date.now()}`,
        action: `${action === 'capture' ? 'Capture' : 'Release'} requested`,
        meta: `${row.guest} at ${row.property}`,
      },
      ...currentLogs,
    ])
  }

  function handleTaskStatusChange(taskId, nextStatus) {
    setOperationsTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task))
    )
  }

  function handleCalendarDrop(property, day) {
    if (!draggedCalendarBlock) {
      return
    }

    setCalendarRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        blocks:
          row.id === draggedCalendarBlock.rowId
            ? row.blocks.filter((block) => block.id !== draggedCalendarBlock.id)
            : row.blocks,
      })).map((row) =>
        row.id === property
          ? {
              ...row,
              blocks: [
                ...row.blocks,
                {
                  ...draggedCalendarBlock,
                  day,
                },
              ],
            }
          : row
      )
    )

    setDraggedCalendarBlock(null)
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
              Admin panel
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
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="space-y-5">
              <Badge tone="accent" className="bg-white/10 text-stone-100">
                Live operations workspace
              </Badge>
              <div className="space-y-3">
                <h3 className="max-w-2xl text-3xl font-medium tracking-tight">
                  Premium hotel operations without clutter.
                </h3>
                <p className="max-w-2xl text-sm text-stone-300">
                  This layout keeps reservations, payments, deposits, and the assistant in one
                  calm workspace. It stays honest about missing data instead of filling the screen
                  with noise.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className={buttonSecondaryClasses} to="/bookings/latest">
                  Open live booking feed
                </Link>
                {isSuperAdmin ? (
                  <Link className={buttonPrimaryClasses} to="/signup">
                    Invite admin
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {adminData.upcoming.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-inner"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                    {item.label}
                  </p>
                  <h4 className="mt-3 text-lg font-medium">{item.title}</h4>
                  <p className="mt-2 text-sm text-stone-300">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-4">
          {adminData.kpis.map((item) => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
          <Card className="p-6">
            <SectionHeader
              eyebrow="Recent bookings"
              title="Latest reservation activity"
              description="Rows stay minimal, with the full booking detail available in the side panel."
              action={
                <button
                  type="button"
                  className={buttonSecondaryClasses}
                  onClick={() => setActiveSection('reservations')}
                >
                  Open reservations
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
                        <p className="font-medium text-stone-900">{row.guest}</p>
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
                        <p className="mt-1 text-xs text-stone-400">{row.confirmation}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'stay',
                    label: 'Stay',
                    render: (row) => (
                      <div>
                        <p>{formatDate(row.checkIn)}</p>
                        <p className="mt-1 text-xs text-stone-400">{formatDate(row.checkOut)}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (row) => <Badge tone={row.statusTone}>{row.status}</Badge>,
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    className: 'font-medium text-stone-900',
                  },
                ]}
                rows={reservationRows}
                onRowClick={setSelectedReservation}
                emptyTitle="No recent bookings yet."
                emptyDescription="As soon as Guesty returns a reservation, it will appear here."
              />
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader
              eyebrow="Assistant"
              title="Embedded AI operator"
              description="Concise answers only, grounded in the latest booking data."
            />
            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-white">
                    <SparklesIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-900">OneLuxStay Assistant</p>
                    <p className="text-sm text-stone-500">
                      Asks the serverless function for the latest Guesty context.
                    </p>
                  </div>
                </div>
              </div>

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

              <div className="space-y-3">
                <textarea
                  rows="4"
                  className={fieldClasses}
                  placeholder="Ask about bookings, payments, guests, or risks..."
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
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-6">
            <SectionHeader
              eyebrow="Alerts"
              title="Risks and follow-ups"
              description="Alerts stay focused on what needs action instead of overloading the screen."
            />
            <div className="mt-6 space-y-3">
              {alertRows.map((item) => (
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
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader
              eyebrow="Operations pulse"
              title="Upcoming check-ins and check-outs"
              description="Short, readable summaries keep the front desk and housekeeping aligned."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {adminData.upcoming.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                      {item.label === 'Check-in' ? (
                        <ClockIcon className="h-4 w-4" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{item.title}</p>
                      <p className="text-sm text-stone-500">{item.label}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-stone-500">{item.meta}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  function renderReservationsSection() {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Reservation table"
          title="Live filters with a slide-over detail panel"
          description="Rows stay light so the team can scan quickly and open only the booking they need."
        />
        <div className="mt-6 grid gap-3 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Date
            </span>
            <select
              className={fieldClasses}
              value={reservationFilters.date}
              onChange={(event) =>
                setReservationFilters((current) => ({ ...current, date: event.target.value }))
              }
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="next7">Next 7 days</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Property
            </span>
            <select
              className={fieldClasses}
              value={reservationFilters.property}
              onChange={(event) =>
                setReservationFilters((current) => ({ ...current, property: event.target.value }))
              }
            >
              <option value="all">All properties</option>
              {propertyOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Status
            </span>
            <select
              className={fieldClasses}
              value={reservationFilters.status}
              onChange={(event) =>
                setReservationFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="all">All statuses</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Source
            </span>
            <select
              className={fieldClasses}
              value={reservationFilters.source}
              onChange={(event) =>
                setReservationFilters((current) => ({ ...current, source: event.target.value }))
              }
            >
              <option value="all">All sources</option>
              {sourceOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6">
          <DataTable
            columns={[
              {
                key: 'guest',
                label: 'Guest',
                render: (row) => (
                  <div>
                    <p className="font-medium text-stone-900">{row.guest}</p>
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
                render: (row) => <Badge tone={row.statusTone}>{row.status}</Badge>,
              },
              {
                key: 'amount',
                label: 'Amount',
                className: 'font-medium text-stone-900',
              },
            ]}
            rows={reservationRows}
            onRowClick={setSelectedReservation}
            emptyTitle="No reservations match these filters."
            emptyDescription="Try clearing the filters or wait for the next Guesty sync."
          />
        </div>
      </Card>
    )
  }

  function renderCalendarSection() {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Calendar"
          title="Drag-and-drop blocking preview"
          description="Drag a block to another day or property. This gives the team a layout-ready calendar before deeper availability sync is added."
        />
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))] gap-2 text-center text-xs font-medium uppercase tracking-[0.22em] text-stone-400">
            <div className="rounded-2xl bg-stone-50 px-3 py-3 text-left">Property</div>
            {calendarRows[0]?.days.map((day) => (
              <div key={day} className="rounded-2xl bg-stone-50 px-2 py-3">
                {day}
              </div>
            ))}
          </div>
          {calendarRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))] gap-2"
            >
              <div className="rounded-[22px] border border-stone-200 bg-white px-4 py-4">
                <p className="font-medium text-stone-900">{row.property}</p>
                <p className="mt-1 text-sm text-stone-500">Drag blocks between days</p>
              </div>
              {row.days.map((day, dayIndex) => {
                const dayBlocks = row.blocks.filter((block) => block.day === dayIndex)

                return (
                  <div
                    key={`${row.id}-${day}`}
                    className="min-h-[88px] rounded-[22px] border border-dashed border-stone-200 bg-stone-50/70 p-2"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleCalendarDrop(row.id, dayIndex)}
                  >
                    <div className="flex h-full flex-col gap-2">
                      {dayBlocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          draggable
                          onDragStart={() =>
                            setDraggedCalendarBlock({
                              ...block,
                              rowId: row.id,
                            })
                          }
                          className={cx(
                            'rounded-2xl px-3 py-2 text-left text-xs font-medium transition duration-200 hover:-translate-y-0.5',
                            block.tone === 'accent'
                              ? 'bg-stone-950 text-white'
                              : block.tone === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-white text-stone-700'
                          )}
                        >
                          {block.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Card>
    )
  }

  function renderPropertiesSection() {
    return propertyRows.length ? (
      <div className="grid gap-4 xl:grid-cols-3">
        {propertyRows.map((property) => (
          <Card key={property.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                    Property
                  </p>
                  <h3 className="mt-2 text-xl font-medium tracking-tight text-stone-950">
                    {property.name}
                  </h3>
                </div>
                <Badge tone={property.statusTone}>{property.status}</Badge>
              </div>
              <p className="text-sm leading-7 text-stone-500">{property.note}</p>
            </div>
          </Card>
        ))}
      </div>
    ) : (
      <EmptyState
        title="No property cards yet."
        description="Once more listing data is synced, each property will show occupancy, issues, and live readiness."
      />
    )
  }

  function renderGuestsSection() {
    return guestRows.length ? (
      <div className="grid gap-4 xl:grid-cols-3">
        {guestRows.map((guest) => (
          <Card key={guest.id} className="p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Guest
            </p>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-stone-950">{guest.name}</h3>
            <p className="mt-4 text-sm text-stone-500">{guest.email}</p>
            <p className="mt-4 text-sm leading-7 text-stone-500">{guest.note}</p>
          </Card>
        ))}
      </div>
    ) : (
      <EmptyState
        title="No guest profiles yet."
        description="Guest cards will appear after bookings are synced from your reservation source."
      />
    )
  }

  function renderPaymentsSection() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <SectionHeader
            eyebrow="Transactions"
            title="Payment status and source of truth"
            description="This panel stays clean until detailed payment mapping is available."
          />
          <div className="mt-6">
            <DataTable
              columns={[
                { key: 'guest', label: 'Guest', className: 'font-medium text-stone-900' },
                { key: 'property', label: 'Property' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <Badge tone={row.statusTone}>{row.status}</Badge>,
                },
                { key: 'amount', label: 'Amount', className: 'font-medium text-stone-900' },
              ]}
              rows={paymentRows}
              emptyTitle="No payment data yet."
              emptyDescription="Payment status will populate here once transaction events are connected."
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader
            eyebrow="Breakdown"
            title="Room, taxes, fees, and deposit"
            description="A focused card for the booking currently in view."
          />
          <div className="mt-6 space-y-3">
            {paymentRows[0] ? (
              ['room', 'taxes', 'fees', 'deposit'].map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[22px] border border-stone-200 bg-stone-50/70 px-4 py-4"
                >
                  <p className="text-sm font-medium capitalize text-stone-700">{key}</p>
                  <p className="text-sm text-stone-500">{paymentRows[0][key]}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">I don’t have that data available yet.</p>
            )}
          </div>
        </Card>
      </div>
    )
  }

  function renderDepositsSection() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="p-6">
          <SectionHeader
            eyebrow="Deposit controls"
            title="Capture or release with a clear activity trail"
            description="These actions are wired into the UI first, so operations flow is ready when deposit events are connected."
          />
          <div className="mt-6 space-y-4">
            {depositRows.length ? (
              depositRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-medium tracking-tight text-stone-950">
                        {row.guest}
                      </p>
                      <p className="text-sm text-stone-500">{row.property}</p>
                      <p className="text-sm text-stone-500">{row.amount}</p>
                    </div>
                    <div className="space-y-3">
                      <Badge tone={row.statusTone}>{row.status}</Badge>
                      <p className="text-sm text-stone-500">{row.lastUpdated}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={buttonSecondaryClasses}
                      onClick={() => handleDepositAction(row, 'release')}
                    >
                      Release
                    </button>
                    <button
                      type="button"
                      className={buttonPrimaryClasses}
                      onClick={() => handleDepositAction(row, 'capture')}
                    >
                      Capture
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No deposits available yet."
                description="Deposit status appears here once payment events are connected."
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader
            eyebrow="Activity log"
            title="Recent deposit events"
            description="Each action writes a visible log entry so nothing disappears after a click."
          />
          <div className="mt-6 space-y-3">
            {depositLogs.map((item) => (
              <div
                key={item.id}
                className="rounded-[22px] border border-stone-200 bg-stone-50/70 p-4"
              >
                <p className="font-medium text-stone-900">{item.action}</p>
                <p className="mt-2 text-sm text-stone-500">{item.meta}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  function renderOperationsSection() {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Task management"
          title="Assign staff and track execution status"
          description="Operations stay compact with inline task updates and ownership clearly visible."
        />
        <div className="mt-6 space-y-4">
          {operationsTasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-4 rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm xl:grid-cols-[1.4fr_repeat(3,minmax(0,0.8fr))]"
            >
              <div>
                <p className="text-lg font-medium tracking-tight text-stone-950">{task.title}</p>
                <p className="mt-2 text-sm text-stone-500">{task.property}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Assignee
                </p>
                <p className="mt-3 text-sm text-stone-700">{task.assignee}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Due
                </p>
                <p className="mt-3 text-sm text-stone-700">{task.due}</p>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                  Status
                </span>
                <select
                  className={fieldClasses}
                  value={task.status}
                  onChange={(event) => handleTaskStatusChange(task.id, event.target.value)}
                >
                  <option>Planned</option>
                  <option>In progress</option>
                  <option>Blocked</option>
                  <option>Done</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  function renderReportsSection() {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {adminData.reports.map((report) => (
          <Card key={report.id} className="p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Report card
            </p>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-stone-950">
              {report.title}
            </h3>
            <p className="mt-5 text-2xl font-medium tracking-tight text-stone-950">
              {report.value}
            </p>
            <p className="mt-4 text-sm leading-7 text-stone-500">{report.note}</p>
          </Card>
        ))}
      </div>
    )
  }

  function renderSettingsSection() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {adminData.settingsGroups.map((group) => (
          <Card key={group.id} className="p-6">
            <SectionHeader eyebrow="Settings group" title={group.title} />
            <div className="mt-6 space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[22px] border border-stone-200 bg-stone-50/70 px-4 py-4"
                >
                  <p className="text-sm font-medium text-stone-700">{item.label}</p>
                  <p className="text-sm text-stone-500">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  function renderActiveSection() {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardSection()
      case 'reservations':
        return renderReservationsSection()
      case 'calendar':
        return renderCalendarSection()
      case 'properties':
        return renderPropertiesSection()
      case 'guests':
        return renderGuestsSection()
      case 'payments':
        return renderPaymentsSection()
      case 'deposits':
        return renderDepositsSection()
      case 'operations':
        return renderOperationsSection()
      case 'reports':
        return renderReportsSection()
      case 'settings':
        return renderSettingsSection()
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
                      placeholder="Search bookings, guests, or properties"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className={buttonSecondaryClasses}>
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Filters
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
                  <Badge tone={bookingLoading ? 'warning' : bookingError ? 'danger' : 'success'}>
                    {bookingLoading ? 'Loading Guesty' : bookingError ? 'Sync issue' : 'Guesty live'}
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
        open={!!selectedReservation}
        title={selectedReservation?.guest || 'Reservation details'}
        description={
          selectedReservation
            ? `${selectedReservation.property} • ${selectedReservation.confirmation}`
            : ''
        }
        onClose={() => setSelectedReservation(null)}
        footer={
          <div className="flex flex-wrap gap-3">
            <button type="button" className={buttonSecondaryClasses} onClick={() => setSelectedReservation(null)}>
              Close
            </button>
            <Link className={buttonPrimaryClasses} to="/bookings/latest">
              Open live feed
            </Link>
          </div>
        }
      >
        {selectedReservation ? (
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                    Guest
                  </p>
                  <h4 className="mt-2 text-xl font-medium tracking-tight text-stone-950">
                    {selectedReservation.guest}
                  </h4>
                  <p className="mt-3 text-sm text-stone-500">{selectedReservation.guestEmail}</p>
                </div>
                <Badge tone={selectedReservation.statusTone}>{selectedReservation.status}</Badge>
              </div>
            </Card>

            <Card className="p-5">
              <div className="space-y-4">
                {[
                  ['Property', selectedReservation.property],
                  ['Source', selectedReservation.source],
                  ['Check-in', formatDate(selectedReservation.checkIn)],
                  ['Check-out', formatDate(selectedReservation.checkOut)],
                  ['Amount', selectedReservation.amount],
                  ['Confirmation', selectedReservation.confirmation],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-stone-700">{label}</p>
                    <p className="text-sm text-stone-500">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
                Notes
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-500">
                {selectedReservation.note}
              </p>
            </Card>
          </div>
        ) : null}
      </SlideOver>
    </main>
  )
}

export default Dashboard
