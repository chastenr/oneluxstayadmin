import { Link } from 'react-router-dom'

const serviceNotes = [
  'Real-time reservation visibility',
  'Guest-ready operations tracking',
  'Luxury stay performance snapshots',
]

const metrics = [
  { label: 'Properties under watch', value: '18' },
  { label: 'Guest requests resolved', value: '96%' },
  { label: 'Average response window', value: '11 min' },
]

function HomePage() {
  return (
    <main className="home-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">ONELUXSTAY ADMIN</p>
          <h1 className="hero-title">A calmer control room for premium stays.</h1>
          <p className="hero-text">
            Keep your teams aligned across arrivals, guest care, and property
            readiness from one focused dashboard.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/signin">
              Sign in
            </Link>
            <Link className="button button-secondary" to="/signup">
              Create account
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <p className="card-kicker">Today&apos;s Focus</p>
          <div className="hero-stat">
            <span>12</span>
            <p>Check-ins confirmed before noon</p>
          </div>
          <ul className="detail-list">
            {serviceNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="metrics-grid" aria-label="performance overview">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <p className="metric-value">{metric.value}</p>
            <p className="metric-label">{metric.label}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default HomePage
