import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const apiBase = import.meta.env.VITE_API_BASE || '/.netlify/functions'

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
    value: 'Ops follow-up',
    note: 'Ask the concierge what still needs manual review.',
    linkLabel: 'Ask about deposits',
    preset: 'Which deposits need action?',
  },
]

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
        'The AI function is not running on this URL yet. If you are testing locally, use Netlify Dev or deploy the site first.'
      )
    }

    throw new Error(text)
  }
}

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

  async function askAssistant(customQuestion) {
    const finalQuestion = (customQuestion ?? question).trim()

    if (!finalQuestion) {
      setError('Type a question first.')
      return
    }

    setLoading(true)
    setError('')
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
          <h2 className="display-title">Simple, calm, and ready for live ops.</h2>
          <p className="body-copy">
            Ask about the latest booking, arrivals, or booking status from Guesty.
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
            <span className="status-pill">{loading ? 'Asking' : 'AI live'}</span>
          </div>

          <div className="concierge-message">
            <p className="chat-role">System</p>
            <p>
              This assistant uses a serverless function to read the latest Guesty reservation
              and answer concise operational questions.
            </p>
          </div>

          <div className="prompt-grid">
            {suggestedQuestions.map((item) => (
              <button key={item} type="button" onClick={() => askAssistant(item)}>
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
            <button className="primary-button" type="button" onClick={() => askAssistant()}>
              {loading ? 'Sending...' : 'Send'}
            </button>
            <p className="helper-copy">
              Runs through <code>{`${apiBase}/guesty-assistant`}</code>.
            </p>
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
                <button
                  className="secondary-link"
                  type="button"
                  onClick={() => askAssistant(card.preset)}
                >
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
