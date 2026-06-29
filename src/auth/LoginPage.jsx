import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <h1>Stock Observability</h1>
        <p className="login-subtitle">Sign in to your tenant account</p>
        
        {error && <p className="login-error">{error}</p>}
        
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Email" 
          className="login-input"
          required
        />
        
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="Password" 
          className="login-input"
          required
        />
        
        <button type="submit" className="login-button">Sign In</button>
      </form>
    </div>
  );
}
