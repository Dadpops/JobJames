import { useState } from 'react'
import { API_BASE, login, register } from '../api/client'
import './OnboardingScreen.css'

export default function OnboardingScreen({ onComplete }) {
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [newCode, setNewCode] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!code.trim()) {
        const data = await register(name.trim())
        localStorage.setItem('jj_access_code', data.access_code)
        if (name.trim()) localStorage.setItem('jobjames_display_name', name.trim())
        setNewCode(data.access_code)
      } else {
        const data = await login(code.trim().toUpperCase(), name.trim())
        localStorage.setItem('jj_access_code', data.access_code)
        if (data.display_name) localStorage.setItem('jobjames_display_name', data.display_name)
        else if (name.trim()) localStorage.setItem('jobjames_display_name', name.trim())
        onComplete(data.access_code, data.display_name || name.trim())
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmed() {
    onComplete(newCode, name.trim())
  }

  if (newCode) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-card">
          <div className="onboarding-logo">JJ</div>
          <h1 className="onboarding-title">Account created</h1>
          <p className="onboarding-body">
            Save your access code — you'll need it to sign in on other devices or after clearing your browser data.
          </p>
          <div className="onboarding-code-box">
            <span className="onboarding-code-value">{newCode}</span>
          </div>
          <p className="onboarding-code-hint">Write it down or copy it somewhere safe.</p>
          <button className="onboarding-btn" onClick={handleConfirmed}>
            I've saved it — Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-logo">JJ</div>
        <h1 className="onboarding-title">JobJames</h1>
        <p className="onboarding-body">Your personal job search dashboard</p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="onboarding-field">
            <label className="onboarding-label" htmlFor="ob-name">Your name</label>
            <input
              id="ob-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. James"
              className="onboarding-input"
              autoComplete="name"
            />
          </div>

          <div className="onboarding-field">
            <label className="onboarding-label" htmlFor="ob-code">
              Access code
              <span className="onboarding-optional"> — leave blank to create a new account</span>
            </label>
            <input
              id="ob-code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="XXXX-XXXX"
              className="onboarding-input onboarding-input-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && <p className="onboarding-error">{error}</p>}

          <button type="submit" className="onboarding-btn" disabled={loading}>
            {loading ? 'One moment…' : code.trim() ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
