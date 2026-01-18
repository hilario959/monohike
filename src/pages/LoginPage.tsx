import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
        shouldCreateUser: false
      }
    });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email for the login link.');
      setSent(true);
    }
    setSending(false);
  };

  return (
    <section>
      <div className="card">
        <p className="section-title">Log in</p>
        <p className="muted">We will email you a magic link.</p>
        <label className="muted" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <div className="button-row" style={{ marginTop: '0.75rem' }}>
          <button className="primary-button" onClick={handleMagicLink} disabled={sending || !email}>
            {sending ? 'Sending...' : sent ? 'Resend link' : 'Send login link'}
          </button>
        </div>
        {message && (
          <p
            className={message.toLowerCase().includes('error') ? 'alert' : 'muted'}
            style={{ marginTop: '0.75rem' }}
          >
            {message}
          </p>
        )}
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
