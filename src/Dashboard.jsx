import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const suggestedQuestions = [
  'Latest booking',
  'Arrivals today',
  'Deposits needing action',
]

const overviewCards = [
  {
    title: 'Latest booking',
    value: 'Guesty feed',
    note: 'Review the newest reservation pulled from Guesty.',
    linkLabel: 'Open booking feed',
    linkTo: '/bookings/latest',
  },
  {
    title: 'Arrivals today',
    value: 'AI question',
    note: 'Ask the concierge what arrivals are due today.',
    linkLabel: 'Try arrivals question',
    preset: 'Do we have any arrivals today?',
  },
  {
    title: 'Deposits',
    value: 'Needs Stripe mapping',
    note: 'Guesty can answer booking questions, but deposit logic still needs Stripe data.',
    linkLabel: 'Ask about deposits',
    preset: 'Which deposits need action?',
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
    <main className="concierge-page">
      <header className="concierge-topbar">
        <div>
          <p className="eyebrow">ONE LUX STAY</p>
          <h1 className="concierge-title">AI Concierge</h1>
        </div>

        <div className="concierge-topbar-actions">
          <span className="user-chip">{user?.email ?? 'unknown user'}</span>
          <button className="ghost-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="concierge-layout">
        <section className="concierge-copy">
          <p className="eyebrow">Internal assistant</p>
          <h2 className="display-title">Simple, calm, and ready for live ops.</h2>
          <p className="body-copy">
            The chat shell is still here, but the backend connection has been removed so you can
            set it up again cleanly.
          </p>
          <Link className="secondary-link" to="/bookings/latest">
            Open latest booking feed
          </Link>
        </section>

        <section className="concierge-card">
          <div className="concierge-card-header">
            <div>
              <p className="eyebrow">Assistant</p>
              <h2>How can I help?</h2>
            </div>
            <span className="status-pill">Disconnected</span>
          </div>

          <div className="concierge-message">
            <p className="chat-role">System</p>
            <p>
              Backend integration has been removed from this project. Reconnect your own API
              or deployment flow when you are ready.
            </p>
          </div>

          <div className="prompt-grid">
            {suggestedQuestions.map((item) => (
              <button key={item} type="button">
                {item}
              </button>
            ))}
          </div>

          <label className="field" htmlFor="assistant-question">
            <span>Ask something</span>
            <textarea
              id="assistant-question"
              rows="5"
              value=""
              onChange={() => {}}
              placeholder="Ask about bookings, arrivals, deposits, or this page..."
              readOnly
            />
          </label>

          <div className="composer-row">
            <button className="primary-button" type="button">
              Send
            </button>
            <p className="helper-copy">Reconnect your backend when you are ready to enable AI.</p>
          </div>
        </section>
      </section>

      <section className="overview-section">
        <div className="overview-header">
          <div>
            <p className="eyebrow">Dashboard overview</p>
            <h2>Quick admin snapshot</h2>
          </div>
        </div>

        <div className="overview-grid">
          {overviewCards.map((card) => (
            <article className="overview-card" key={card.title}>
              <p className="eyebrow">{card.title}</p>
              <h3 className="overview-value">{card.value}</h3>
              <p className="body-copy">{card.note}</p>
              {card.linkTo ? (
                <Link className="secondary-link" to={card.linkTo}>
                  {card.linkLabel}
                </Link>
              ) : (
                <button className="secondary-link" type="button">
                  {card.linkLabel}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Dashboard
