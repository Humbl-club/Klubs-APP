import React from 'react';

export default function TestApp() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#333' }}>Capacitor App is Working!</h1>
      <p style={{ color: '#666' }}>If you can see this, the React app is loading correctly.</p>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2 style={{ color: '#333' }}>Environment Check:</h2>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify({
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
            NODE_ENV: process.env.NODE_ENV || 'NOT SET',
            MODE: import.meta.env.MODE || 'NOT SET',
          }, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2 style={{ color: '#333' }}>Debug Info:</h2>
        <p>User Agent: {navigator.userAgent}</p>
        <p>Platform: {navigator.platform}</p>
        <p>Window Location: {window.location.href}</p>
      </div>
    </div>
  );
}