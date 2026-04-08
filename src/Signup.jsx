import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const apiBase = import.meta.env.VITE_API_BASE || '/.netlify/functions'

function Signup() {
  const { session } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    const normalizedFullName = fullName.trim()
    const normalizedEmail = email.trim().toLowerCase()

    try {
      if (!session?.access_token) {
        throw new Error('Your session expired. Please log in again.')
      }

      const response = await fetch(`${apiBase}/admin-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: normalizedFullName,
          email: normalizedEmail,
          password,
        }),
      })

      const text = await response.text()
      const data = text ? JSON.parse(text) : {}

      if (!response.ok) {
        throw new Error(
          `${data.error || 'Unable to create the account.'}${
            response.status ? ` (status ${response.status})` : ''
          }`
        )
      }

      setFullName('')
      setEmail('')
      setPassword('')
      setMessage(`Account created for ${data.user?.email || normalizedEmail}.`)
    } catch (requestError) {
      const messageText =
        requestError instanceof Error ? requestError.message : 'Unable to create the account.'
      const normalizedMessage = messageText.toLowerCase()

      if (
        normalizedMessage.includes('unexpected token') ||
        normalizedMessage.includes('<!doctype html') ||
        normalizedMessage.includes('<html')
      ) {
        setError(
          'The signup function is not running on this URL yet. If you are testing locally, use Netlify Dev or deploy the site first.'
        )
      } else {
        setError(messageText)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">Superadmin only</p>
          <h1 className="display-title">Create admin access.</h1>
          <p className="body-copy">
            Create accounts for internal admins. Regular admins should not have access to
            this page or the account creation function.
          </p>
        </div>

        <section className="auth-card">
          <h2>Create account</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                placeholder="Chasten Ramirez"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="newadmin@oneluxstay.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Choose a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          {error ? <p className="status-error">{error}</p> : null}
          {message ? <p className="status-success">{message}</p> : null}
          <p className="subtle-link">
            <Link to="/dashboard">Back to dashboard</Link>
          </p>
        </section>
      </section>
    </main>
  )
}

export default Signup
