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

const bookingTimeline = [
  {
    time: '2 min ago',
    title: 'Reservation imported into admin queue',
    meta: 'Awaiting Guesty sync integration',
  },
  {
    time: '6 min ago',
    title: 'Card authorized for security deposit',
    meta: 'Stripe PaymentIntent would appear here',
  },
  {
    time: '9 min ago',
    title: 'Arrival instructions still unsent',
    meta: 'Ops follow-up recommended before 4:00 PM',
  },
]

function LatestBooking() {
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
                    className={`ops-nav-link${item.label === 'Latest Booking' ? ' is-active' : ''}`}
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
            <p className="eyebrow">Latest booking tracker</p>
            <h2 className="ops-page-title">Newest reservation</h2>
            <p className="ops-subtitle">
              Track the most recent booking from intake through deposit and arrival prep.
            </p>
          </div>

          <div className="ops-topbar-actions">
            <button className="button button-secondary" type="button">
              Resend check-in
            </button>
            <button className="button button-primary" type="button">
              Capture deposit
            </button>
            <button className="button button-ghost" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <section className="ops-summary-card">
          <div className="ops-summary-copy">
            <p className="card-kicker">Booking status</p>
            <h3>OLS-2948 • Mia Thompson • Ocean View Villa</h3>
            <p>
              Arrival today at 4:00 PM. Payment collected, deposit authorized, guest
              instructions still need to be sent.
            </p>
          </div>
          <div className="ops-summary-actions">
            <span className="ops-badge is-warning">Needs action</span>
            <span className="ops-badge is-neutral">Demo data</span>
          </div>
        </section>

        <section className="ops-stat-grid">
          <article className="ops-stat-card">
            <p className="ops-stat-label">Booking total</p>
            <p className="ops-stat-value">$1,240</p>
            <p className="ops-stat-note">Direct booking</p>
          </article>
          <article className="ops-stat-card">
            <p className="ops-stat-label">Deposit</p>
            <p className="ops-stat-value">$500</p>
            <p className="ops-stat-note is-warning">Authorized only</p>
          </article>
          <article className="ops-stat-card">
            <p className="ops-stat-label">Stay window</p>
            <p className="ops-stat-value">3 nts</p>
            <p className="ops-stat-note">Apr 6 - Apr 9</p>
          </article>
          <article className="ops-stat-card">
            <p className="ops-stat-label">Sync source</p>
            <p className="ops-stat-value">Mock</p>
            <p className="ops-stat-note">Guesty not connected yet</p>
          </article>
        </section>

        <section className="ops-content-grid">
          <article className="ops-panel ops-panel-wide">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Guest and stay</p>
                <h3>Reservation summary</h3>
              </div>
            </div>

            <div className="booking-grid">
              <div className="booking-block">
                <p className="booking-label">Guest</p>
                <p className="booking-value">Mia Thompson</p>
                <p className="ops-item-meta">mia@example.com • +1 (305) 555-8814</p>
              </div>
              <div className="booking-block">
                <p className="booking-label">Property</p>
                <p className="booking-value">Ocean View Villa</p>
                <p className="ops-item-meta">Miami Beach • 4 bedrooms</p>
              </div>
              <div className="booking-block">
                <p className="booking-label">Check-in</p>
                <p className="booking-value">Today, 4:00 PM</p>
                <p className="ops-item-meta">Instructions not yet sent</p>
              </div>
              <div className="booking-block">
                <p className="booking-label">Payment</p>
                <p className="booking-value">Paid in full</p>
                <p className="ops-item-meta">Stripe PI would surface here</p>
              </div>
            </div>
          </article>

          <article className="ops-panel">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Next actions</p>
                <h3>Ops checklist</h3>
              </div>
            </div>

            <div className="ops-task-list">
              <div className="ops-task-item">
                <div>
                  <p className="ops-item-title">Send check-in instructions</p>
                  <p className="ops-item-meta">Needed before guest arrival</p>
                </div>
                <span className="ops-badge is-high">urgent</span>
              </div>
              <div className="ops-task-item">
                <div>
                  <p className="ops-item-title">Confirm door code delivery</p>
                  <p className="ops-item-meta">Linked to welcome message</p>
                </div>
                <span className="ops-badge is-neutral">pending</span>
              </div>
              <div className="ops-task-item">
                <div>
                  <p className="ops-item-title">Review deposit after checkout</p>
                  <p className="ops-item-meta">Auto reminder after Apr 9</p>
                </div>
                <span className="ops-badge is-warning">scheduled</span>
              </div>
            </div>
          </article>

          <article className="ops-panel ops-panel-wide">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Timeline</p>
                <h3>Latest booking activity</h3>
              </div>
            </div>

            <div className="booking-timeline">
              {bookingTimeline.map((item) => (
                <div className="booking-timeline-item" key={`${item.time}-${item.title}`}>
                  <p className="booking-time">{item.time}</p>
                  <div>
                    <p className="ops-item-title">{item.title}</p>
                    <p className="ops-item-meta">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="ops-panel">
            <div className="ops-panel-header">
              <div>
                <p className="card-kicker">Integration</p>
                <h3>Guesty connection</h3>
              </div>
            </div>

            <div className="integration-card">
              <span className="ops-badge is-high">Not connected</span>
              <p className="ops-item-meta">
                This page is currently static UI only. To connect live bookings, we need a
                Netlify Function that pulls the newest reservation from Guesty and stores or
                returns it here.
              </p>
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}

export default LatestBooking
