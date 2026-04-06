import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

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
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">Hidden setup</p>
          <h1 className="display-title">Create admin access.</h1>
          <p className="body-copy">
            Use this only for internal team onboarding while the admin workspace is being
            configured.
          </p>
        </div>

        <section className="auth-card">
          <h2>Sign up</h2>
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
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          {error ? <p className="status-error">{error}</p> : null}
          {message ? <p className="status-success">{message}</p> : null}
          <p className="subtle-link">
            <Link to="/signin">Back to log in</Link>
          </p>
        </section>
      </section>
    </main>
  )
}

export default Signup
