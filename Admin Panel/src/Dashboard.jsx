import { useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Latest Booking', path: '/bookings/latest' },
      { label: 'Deposits', path: '/dashboard' },
      { label: 'Properties', path: '/dashboard' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Guests', path: '/dashboard' },
      { label: 'Tasks', path: '/dashboard' },
      { label: 'Messaging', path: '/dashboard' },
      { label: 'Reports', path: '/dashboard' },
    ],
  },
]

const stats = [
  { label: 'Bookings today', value: '14', note: '+3 vs yesterday', tone: 'neutral' },
  { label: 'Gross revenue', value: '$18.4k', note: 'Net $14.2k', tone: 'positive' },
  { label: 'Occupancy', value: '86%', note: 'Week average', tone: 'neutral' },
  { label: 'Deposits pending', value: '7', note: '3 need action now', tone: 'warning' },
]

const alerts = [
  {
    title: 'Guest checking in today has no check-in instructions sent',
    meta: 'Loft 08 • 4:00 PM arrival',
    level: 'high',
  },
  {
    title: 'Security deposit still capturable after checkout',
    meta: 'Ocean View Villa • due 2h ago',
    level: 'medium',
  },
  {
    title: 'Failed card retry on booking OLS-2931',
    meta: 'Direct booking • $1,240 outstanding',
    level: 'high',
  },
]

const arrivals = [
  {
    guest: 'Mia Thompson',
    property: 'Ocean View Villa',
    timing: 'Check-in 4:00 PM',
    status: 'Instructions sent',
  },
  {
    guest: 'Daniel Park',
    property: 'Loft 08',
    timing: 'Check-in 3:00 PM',
    status: 'Needs deposit',
  },
  {
    guest: 'Sofia Ramirez',
    property: 'Palm Residence',
    timing: 'Check-out 11:00 AM',
    status: 'Turnover in progress',
  },
]

const deposits = [
  {
    reservation: 'OLS-2931',
    guest: 'Daniel Park',
    amount: '$500',
    status: 'Pending capture',
    action: 'Capture',
  },
  {
    reservation: 'OLS-2904',
    guest: 'Nina West',
    amount: '$350',
    status: 'Release due',
    action: 'Release',
  },
  {
    reservation: 'OLS-2888',
    guest: 'Marcus Lee',
    amount: '$750',
    status: 'Authorized',
    action: 'Review',
  },
]

const tasks = [
  {
    title: 'Restock guest amenity kits',
    property: 'Palm Residence',
    owner: 'Housekeeping',
    state: 'In progress',
  },
  {
    title: 'Replace patio light switch',
    property: 'Ocean View Villa',
    owner: 'Maintenance',
    state: 'Pending',
  },
  {
    title: 'Verify WiFi instructions in template',
    property: 'Loft 08',
    owner: 'Guest Ops',
    state: 'Completed',
  },
]

function Dashboard() {
  const navigate = useNavigate()
  const { user, supabase } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <main className="ops-dashboard">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <p className="eyebrow">ONELUXSTAY</p>
          <h1 className="ops-brand-title">Admin</h1>
        </div>

        <div className="ops-nav">
          {navGroups.map((group) => (
            <section key={group.title} className="ops-nav-group">
              <p className="ops-nav-title">{group.title}</p>
              <div className="ops-nav-links">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    className={`ops-nav-link${item.label === 'Dashboard' ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="ops-sidebar-footer">
          <p className="ops-sidebar-label">Signed in</p>
          <p className="ops-sidebar-user">{user?.email ?? 'unknown user'}</p>
        </div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar">
          <div>
            <p className="eyebrow">Today at a glance</p>
            <h2 className="ops-page-title">Operations dashboard</h2>
            <p className="ops-subtitle">
              Live visibility across reservations, deposits, and guest care.
            </p>
          </div>

          <div className="ops-topbar-actions">
            <button className="button button-secondary" type="button">
              Message guest
            </button>
            <button className="button button-primary" type="button">
              Create booking
            </button>
            <button className="button button-ghost" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <section className="ops-summary-card">
          <div className="ops-summary-copy">
            <p className="card-kicker">Priority focus</p>
            <h3>3 deposits need action before the end of day.</h3>
            <p>
              Same-day arrivals, failed payment retries, and release deadlines are
              concentrated in the next four hours.
            </p>
          </div>
          <div className="ops-summary-actions">
            <button className="button button-primary" type="button">
              Review deposits
            </button>
            <button className="button button-secondary" type="button">
              Open alert center
            </button>
          </div>
        </section>

        <section className="ops-stat-grid">
          {stats.map((stat) => (
            <article className="ops-stat-card" key={stat.label}>
              <p className="ops-stat-label">{stat.label}</p>
              <p className="ops-stat-value">{stat.value}</p>
              <p className={`ops-stat-note is-${stat.tone}`}>{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="ops-content-grid">
          <article className="ops-panel ops-panel-wide">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Alerts</p>
                <h3>Issues that need attention now</h3>
              </div>
              <button className="ops-text-action" type="button">
                View all
              </button>
            </div>

            <div className="ops-alert-list">
              {alerts.map((alert) => (
                <div className="ops-alert-item" key={alert.title}>
                  <div>
                    <p className="ops-item-title">{alert.title}</p>
                    <p className="ops-item-meta">{alert.meta}</p>
                  </div>
                  <span className={`ops-badge is-${alert.level}`}>{alert.level}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="ops-panel">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Quick actions</p>
                <h3>Most common admin moves</h3>
              </div>
            </div>
            <div className="ops-action-grid">
              <button className="ops-action-tile" type="button">
                Capture deposit
              </button>
              <button className="ops-action-tile" type="button">
                Release deposit
              </button>
              <button className="ops-action-tile" type="button">
                Resend check-in
              </button>
              <button className="ops-action-tile" type="button">
                Create task
              </button>
            </div>
          </article>

          <article className="ops-panel ops-panel-wide">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Stay flow</p>
                <h3>Arrivals and departures</h3>
              </div>
              <button
                className="ops-text-action"
                type="button"
                onClick={() => navigate('/bookings/latest')}
              >
                Track latest booking
              </button>
            </div>

            <div className="ops-table">
              {arrivals.map((item) => (
                <div className="ops-table-row" key={`${item.guest}-${item.property}`}>
                  <div>
                    <p className="ops-item-title">{item.guest}</p>
                    <p className="ops-item-meta">{item.property}</p>
                  </div>
                  <p className="ops-table-time">{item.timing}</p>
                  <span className="ops-badge is-neutral">{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="ops-panel">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Deposits</p>
                <h3>Queue requiring review</h3>
              </div>
            </div>

            <div className="ops-deposit-list">
              {deposits.map((deposit) => (
                <div className="ops-deposit-item" key={deposit.reservation}>
                  <div>
                    <p className="ops-item-title">
                      {deposit.reservation} • {deposit.guest}
                    </p>
                    <p className="ops-item-meta">{deposit.amount}</p>
                  </div>
                  <span className="ops-badge is-warning">{deposit.status}</span>
                  <button className="button button-secondary" type="button">
                    {deposit.action}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="ops-panel">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Tasks</p>
                <h3>Operations board</h3>
              </div>
            </div>

            <div className="ops-task-list">
              {tasks.map((task) => (
                <div className="ops-task-item" key={task.title}>
                  <div>
                    <p className="ops-item-title">{task.title}</p>
                    <p className="ops-item-meta">
                      {task.property} • {task.owner}
                    </p>
                  </div>
                  <span className="ops-badge is-neutral">{task.state}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="ops-panel">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Channel mix</p>
                <h3>Booking sources this week</h3>
              </div>
            </div>

            <div className="ops-mini-metrics">
              <div className="ops-mini-metric">
                <span>Airbnb</span>
                <strong>42%</strong>
              </div>
              <div className="ops-mini-metric">
                <span>Direct</span>
                <strong>31%</strong>
              </div>
              <div className="ops-mini-metric">
                <span>Booking.com</span>
                <strong>19%</strong>
              </div>
              <div className="ops-mini-metric">
                <span>Other</span>
                <strong>8%</strong>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}

export default Dashboard
