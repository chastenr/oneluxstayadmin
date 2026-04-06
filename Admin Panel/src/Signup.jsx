import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const onboardingNotes = [
  'Create access for your operations team',
  'Store name details safely in Supabase',
  'Move straight into the admin dashboard after approval',
]

function Signup() {
  const navigate = useNavigate()
  const { supabase } = useAuth()
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signin`,
        data: {
          full_name: fullName.trim(),
        },
      },
    })

    setSubmitting(false)

    if (signUpError) {
      console.error('Supabase sign up failed:', signUpError)
      setError(
        `${signUpError.message}${signUpError.status ? ` (status ${signUpError.status})` : ''}`
      )
      return
    }

    if (data.session) {
      navigate('/dashboard', { replace: true })
      return
    }

    setMessage('Account created. Check your email to confirm your account.')
  }

  return (
    <main className="auth-shell">
      <section className="auth-showcase">
        <p className="eyebrow">TEAM ACCESS</p>
        <h1 className="hero-title">Create a polished back office for every stay.</h1>
        <p className="hero-text">
          Set up an admin account for reservations, guest care, and property
          visibility across the ONELUXSTAY portfolio.
        </p>
        <ul className="detail-list">
          {onboardingNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <p className="card-kicker">Admin onboarding</p>
          <h2>Sign up</h2>
          <p>Create your admin account.</p>
        </div>

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
              placeholder="Choose a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {error ? <p className="status-message status-error">{error}</p> : null}
        {message ? <p className="status-message status-success">{message}</p> : null}

        <p className="auth-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </section>
    </main>
  )
}

export default Signup
