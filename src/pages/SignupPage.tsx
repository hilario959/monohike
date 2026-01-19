import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');

  const handleMagicLink = async () => {
    if (!email) return;
    setSending(true);
    setMessage(null);
    setSent(false);
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true
      }
    });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email for the signup code.');
      setSent(true);
      setStep('code');
    }
    setSending(false);
  };

  const handleVerify = async () => {
    if (!email || !code) return;
    setVerifying(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Account verified. Redirecting...');
    }
    setVerifying(false);
  };

  return (
    <section className="auth-shell">
      <div className="auth-brand">
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="auth-logo" />
        <span className="auth-title">MonoHike</span>
      </div>
      <div className="card auth-card">
        {step === 'email' ? (
          <>
            <p className="section-title">Create account</p>
            <p className="muted">We will email you a one-time code to verify.</p>
            <label className="muted" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <div className="button-row" style={{ marginTop: '0.75rem' }}>
              <button
                className="primary-button button-full"
                onClick={handleMagicLink}
                disabled={sending || !email}
              >
                {sending ? 'Sending...' : sent ? 'Resend code' : 'Send code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className="auth-back auth-back--fixed" onClick={() => setStep('email')}>
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path
                  d="M15.5 5.5a1 1 0 0 1 0 1.4L10.4 12l5.1 5.1a1 1 0 0 1-1.4 1.4l-5.8-5.8a1 1 0 0 1 0-1.4l5.8-5.8a1 1 0 0 1 1.4 0z"
                  fill="currentColor"
                />
              </svg>
              Back
            </button>
            <p className="section-title">Enter code</p>
            <label className="muted" htmlFor="signup-code">
              Code
            </label>
            <input
              id="signup-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter the 6-digit code"
            />
            <div className="button-row" style={{ marginTop: '0.75rem' }}>
              <button
                className="secondary-button button-full"
                onClick={handleVerify}
                disabled={verifying || !email || !code}
              >
                {verifying ? 'Verifying...' : 'Verify code'}
              </button>
            </div>
          </>
        )}
        {message && (
          <p
            className={message.toLowerCase().includes('error') ? 'alert' : 'muted'}
            style={{ marginTop: '0.75rem' }}
          >
            {message}
          </p>
        )}
        {step === 'email' && (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        )}
      </div>
    </section>
  );
};

export default SignupPage;
