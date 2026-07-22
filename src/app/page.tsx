'use client';

import { useAuth } from '@/context/AuthContext';

export default function Home() {
  useAuth(); // Activates auth checking and redirecting

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#090d16',
      backgroundImage: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.1) 0%, transparent 70%)'
    }}>
      <div style={{ textAlign: 'center', animation: 'pulse 1.5s infinite alternate' }}>
        <h1 style={{
          color: '#10b981',
          fontSize: '2.5rem',
          fontWeight: 800,
          letterSpacing: '-0.05em',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          GYM EVOLUTION
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '0.1em' }}>
          CARREGANDO SEU PERFIL...
        </p>
      </div>
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.98); opacity: 0.8; }
          100% { transform: scale(1.02); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
