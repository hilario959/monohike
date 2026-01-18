import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const SignupPage = () => {
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
        shouldCreateUser: true
      }
    });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email to finish creating your account.');
      setSent(true);
    }
    setSending(false);
  };

  return (
    <section>
      <div className="card">
        <p className="section-title">Create account</p>
        <p className="muted">We will email you a magic link to verify.</p>
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
          <button className="primary-button" onClick={handleMagicLink} disabled={sending || !email}>
            {sending ? 'Sending...' : sent ? 'Resend link' : 'Send signup link'}
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
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
};

export default SignupPage;
