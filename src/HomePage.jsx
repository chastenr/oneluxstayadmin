import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <p className="eyebrow">ONELUXSTAY ADMIN</p>
        <h1 className="display-title">One place to run guest operations.</h1>
        <p className="body-copy">
          Access the internal operations workspace for bookings, deposits, and guest
          communication.
        </p>
        <div className="cta-row">
          <Link className="primary-button" to="/signin">
            Log in
          </Link>
        </div>
      </section>
    </main>
  )
}

export default HomePage
