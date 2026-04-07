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
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  async function handleAsk() {
    if (!question.trim()) {
      return
    }

    setLoading(true)
    setError('')
    setAnswer('')

    try {
      const response = await fetch('/.netlify/functions/guesty-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to reach the assistant.')
      }

      setAnswer(data.answer ?? '')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
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
          <h2 className="display-title">Guesty-ready operations chat.</h2>
          <p className="body-copy">
            Ask about the newest reservation and basic booking details pulled through a
            Netlify function.
          </p>
          <p className="body-copy">
            Add your Guesty credentials to Netlify and local env to turn this on.
          </p>
          <Link className="secondary-link" to="/bookings/latest">
            Open latest booking
          </Link>
        </section>

        <section className="concierge-card">
          <div className="concierge-card-header">
            <div>
              <p className="eyebrow">Assistant</p>
              <h2>How can I help?</h2>
            </div>
            <span className="status-pill status-pending">
              {loading ? 'Loading' : 'Guesty'}
            </span>
          </div>

          <div className="concierge-message">
            <p className="chat-role">System</p>
            <p>
              Ask about bookings, arrivals, or reservation status. Deposit-specific answers
              still need Stripe wiring.
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
            <button className="primary-button" type="button" onClick={handleAsk} disabled={loading}>
              {loading ? 'Asking...' : 'Send'}
            </button>
            <p className="helper-copy">Uses a Netlify function and Guesty credentials.</p>
          </div>

          {answer ? (
            <div className="concierge-message concierge-message-answer">
              <p className="chat-role">Answer</p>
              <p>{answer}</p>
            </div>
          ) : null}

          {error ? <p className="status-error">{error}</p> : null}
        </section>
      </section>
    </main>
  )
}

export default Dashboard
