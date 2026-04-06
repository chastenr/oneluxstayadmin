import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const trustPoints = [
  'Private admin access only',
  'Live Supabase session handling',
  'Fast handoff into the operations dashboard',
]

function Signin() {
  const navigate = useNavigate()
  const { supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="auth-shell">
      <section className="auth-showcase">
        <p className="eyebrow">ONELUXSTAY</p>
        <h1 className="hero-title">Hospitality operations, without the scramble.</h1>
        <p className="hero-text">
          Sign in to review reservations, guest activity, and the readiness of
          every stay under your care.
        </p>
        <ul className="detail-list">
          {trustPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <p className="card-kicker">Welcome back</p>
          <h2>Sign in</h2>
          <p>Use your admin email to access the control panel.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="admin@oneluxstay.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Enter dashboard'}
          </button>
        </form>

        {error ? <p className="status-message status-error">{error}</p> : null}

        <p className="auth-footer">
          Need an account? <Link to="/signup">Create one</Link>
        </p>
      </section>
    </main>
  )
}

export default Signin
