import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const suggestedQuestions = [
  'Latest booking',
  'Arrivals today',
  'Deposits needing action',
]

function Dashboard() {
  const navigate = useNavigate()
  const { user, supabase } = useAuth()
  const [question, setQuestion] = useState('')

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
            Keep this as the main admin assistant surface for bookings, arrivals, guest
            requests, and deposit follow-up once Guesty is connected.
          </p>
          <p className="body-copy">
            Right now it is a styled placeholder, so you still have something clean on the
            page without fake data.
          </p>
          <Link className="secondary-link" to="/bookings/latest">
            Open latest booking placeholder
          </Link>
        </section>

        <section className="concierge-card">
          <div className="concierge-card-header">
            <div>
              <p className="eyebrow">Assistant</p>
              <h2>How can I help?</h2>
            </div>
            <span className="status-pill status-pending">Not connected</span>
          </div>

          <div className="concierge-message">
            <p className="chat-role">System</p>
            <p>
              Ask about bookings, arrivals, deposits, or guest operations. Live Guesty
              answers will appear here after backend setup.
            </p>
          </div>

          <div className="prompt-grid">
            {suggestedQuestions.map((item) => (
              <button key={item} type="button" onClick={() => setQuestion(item)}>
                {item}
              </button>
            ))}
          </div>

          <label className="field" htmlFor="assistant-question">
            <span>Ask something</span>
            <textarea
              id="assistant-question"
              rows="5"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about bookings, arrivals, deposits, or this page..."
            />
          </label>

          <div className="composer-row">
            <button className="primary-button" type="button" disabled>
              Send
            </button>
            <p className="helper-copy">Guesty and the backend assistant are still offline.</p>
          </div>
        </section>
      </section>
    </main>
  )
}

export default Dashboard
