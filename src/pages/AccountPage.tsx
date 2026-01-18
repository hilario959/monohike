import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AccountPage = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error) {
        setEmail(data.user?.email ?? null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <section>
      <div className="card">
        <p className="section-title">My account</p>
        {loading ? (
          <p className="muted">Loading account...</p>
        ) : (
          <p className="muted">{email ?? 'Unknown user'}</p>
        )}
        <div className="button-row" style={{ marginTop: '0.75rem' }}>
          <button className="secondary-button" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
};

export default AccountPage;
