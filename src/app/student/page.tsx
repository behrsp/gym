'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Activity,
  Apple,
  TrendingUp,
  MessageSquare,
  User,
  CheckCircle,
  HelpCircle,
  Send,
  LogOut,
  Sparkles,
  Camera,
  Weight,
  Target,
  ChevronRight
} from 'lucide-react';

interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
}

interface Workout {
  id: number;
  name: string;
  exercises: Exercise[];
}

interface Meal {
  id: number;
  meal_time: string;
  meal_name: string;
  description: string;
}

interface Measurement {
  id: number;
  date: string;
  type: 'current' | 'target';
  weight: string;
  height: string;
  body_fat: string;
  muscle_mass: string;
  chest: string;
  waist: string;
  hips: string;
  arms: string;
  legs: string;
}

interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  request_type: string | null;
  created_at: string;
  sender_name: string;
  sender_role: string;
}

export default function StudentDashboard() {
  const { user, logout, refreshUser } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'workout' | 'diet' | 'evolution' | 'chat' | 'profile'>('workout');

  // Stats & Progress
  const [stats, setStats] = useState({
    totalCompleted: 0,
    weeklyData: [] as { date: string; count: number }[],
    todayStats: { total: 0, completed: 0, percentage: 0 },
    latestMeasurements: [] as any[]
  });

  // Workouts data
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<number[]>([]);
  const [loadingWorkout, setLoadingWorkout] = useState(true);

  // Diet data
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dietRequested, setDietRequested] = useState(false);
  const [requestingDiet, setRequestingDiet] = useState(false);
  const [dietValidUntil, setDietValidUntil] = useState<string | null>(null);
  const [dietExpired, setDietExpired] = useState<boolean>(false);

  // Measurements data
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Messages data
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Profile Edit fields
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profilePic, setProfilePic] = useState(user?.profile_picture || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Fetch Dashboard Stats & Workouts
  const fetchDashboardStats = async () => {
    try {
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalCompleted: statsData.totalCompleted,
          weeklyData: statsData.weeklyData || [],
          todayStats: statsData.todayStats || { total: 0, completed: 0, percentage: 0 },
          latestMeasurements: statsData.latestMeasurements || []
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchWorkoutData = async () => {
    try {
      const workoutsRes = await fetch('/api/workouts');
      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json();
        setWorkouts(workoutsData.workouts);
      }

      const completedRes = await fetch('/api/exercises/complete');
      if (completedRes.ok) {
        const completedData = await completedRes.json();
        setCompletedExerciseIds(completedData.completedIds || []);
      }
    } catch (err) {
      console.error('Error fetching workout/completions:', err);
    } finally {
      setLoadingWorkout(false);
    }
  };

  const fetchDietData = async () => {
    try {
      const dietRes = await fetch('/api/diets');
      if (dietRes.ok) {
        const dietData = await dietRes.json();
        setMeals(dietData.meals || []);
        setDietRequested(dietData.dietRequested);
        setDietValidUntil(dietData.dietValidUntil);
        setDietExpired(dietData.expired);
      }
    } catch (err) {
      console.error('Error fetching diet data:', err);
    }
  };

  const fetchMeasurements = async () => {
    try {
      const res = await fetch('/api/measurements');
      if (res.ok) {
        const data = await res.json();
        setMeasurements(data.measurements || []);
      }
    } catch (err) {
      console.error('Error fetching measurements:', err);
    }
  };

  // Run on mount & tab switches
  useEffect(() => {
    fetchDashboardStats();
    fetchWorkoutData();
    fetchDietData();
    fetchMeasurements();
    
    // Sync profile form when user context loads
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone);
      setProfilePic(user.profile_picture || '');
    }
  }, [user]);

  // Periodic poll for messaging tab
  useEffect(() => {
    if (activeTab === 'chat') {
      const getChat = async () => {
        try {
          const res = await fetch('/api/messages');
          if (res.ok) {
            const data = await res.json();
            setChatMessages(data.messages || []);
          }
        } catch (err) {
          console.error(err);
        }
      };
      getChat();
      const interval = setInterval(getChat, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Toggle Exercise completion
  const handleToggleComplete = async (exerciseId: number) => {
    try {
      const res = await fetch('/api/exercises/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.completed) {
          setCompletedExerciseIds([...completedExerciseIds, exerciseId]);
        } else {
          setCompletedExerciseIds(completedExerciseIds.filter(id => id !== exerciseId));
        }
        // Refresh dashboard stats
        fetchDashboardStats();
      }
    } catch (err) {
      console.error('Error completing exercise:', err);
    }
  };

  // Request Exercise Change (auto sends message)
  const handleRequestChange = async (exerciseName: string) => {
    if (!confirm(`Deseja enviar uma solicitação de troca para o exercício "${exerciseName}"?`)) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Gostaria de solicitar a troca do exercício: ${exerciseName}`,
          requestType: 'exercise_change'
        })
      });
      if (res.ok) {
        alert('Solicitação enviada via chat para o seu Personal!');
        // switch tab to chat
        setActiveTab('chat');
      } else {
        alert('Erro ao enviar solicitação.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Request Diet
  const handleRequestDiet = async () => {
    setRequestingDiet(true);
    try {
      const res = await fetch('/api/diets/request', { method: 'POST' });
      if (res.ok) {
        setDietRequested(true);
        alert('Solicitação de dieta enviada ao seu Personal Trainer com sucesso.');
      } else {
        alert('Erro ao solicitar dieta.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRequestingDiet(false);
    }
  };

  // Chat message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    setSendingMsg(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessageText })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages([...chatMessages, data.chatMessage]);
        setNewMessageText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          profile_picture: profilePic,
          password: profilePassword || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMessage('Perfil atualizado com sucesso!');
        setProfilePassword('');
        refreshUser();
      } else {
        setProfileError(data.error || 'Erro ao atualizar perfil.');
      }
    } catch (err) {
      setProfileError('Erro de rede ao atualizar perfil.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar for Desktop */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <Activity style={{ color: 'var(--color-primary)' }} />
          <span className="gradient-text">GYM EVOLUTION</span>
        </div>

        <div className="sidebar-nav">
          <button onClick={() => setActiveTab('workout')} className={`nav-link ${activeTab === 'workout' ? 'active' : ''}`}>
            <Activity size={20} />
            Meu Treino
          </button>
          
          <button onClick={() => setActiveTab('diet')} className={`nav-link ${activeTab === 'diet' ? 'active' : ''}`}>
            <Apple size={20} />
            Dieta
          </button>
          
          <button onClick={() => setActiveTab('evolution')} className={`nav-link ${activeTab === 'evolution' ? 'active' : ''}`}>
            <TrendingUp size={20} />
            Evolução
          </button>
          
          <button onClick={() => setActiveTab('chat')} className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}>
            <MessageSquare size={20} />
            Chat Personal
          </button>
          
          <button onClick={() => setActiveTab('profile')} className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}>
            <User size={20} />
            Meu Perfil
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {user?.name.charAt(0)}
              </div>
            )}
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aluno</p>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', gap: '0.5rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav">
        <button onClick={() => setActiveTab('workout')} className={`mobile-nav-link ${activeTab === 'workout' ? 'active' : ''}`}>
          <Activity size={20} />
          Treino
        </button>
        
        <button onClick={() => setActiveTab('diet')} className={`mobile-nav-link ${activeTab === 'diet' ? 'active' : ''}`}>
          <Apple size={20} />
          Dieta
        </button>
        
        <button onClick={() => setActiveTab('evolution')} className={`mobile-nav-link ${activeTab === 'evolution' ? 'active' : ''}`}>
          <TrendingUp size={20} />
          Evolução
        </button>
        
        <button onClick={() => setActiveTab('chat')} className={`mobile-nav-link ${activeTab === 'chat' ? 'active' : ''}`}>
          <MessageSquare size={20} />
          Chat
        </button>
        
        <button onClick={() => setActiveTab('profile')} className={`mobile-nav-link ${activeTab === 'profile' ? 'active' : ''}`}>
          <User size={20} />
          Perfil
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        {/* Header summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Fala, {user?.name.split(' ')[0]}! 🔥</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Foco nos objetivos de hoje! Marque os exercícios completados.</p>
          </div>
          
          {/* Progress circle display */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Conclusão Hoje</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{stats.todayStats.percentage}%</span>
            </div>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: `conic-gradient(var(--color-primary) ${stats.todayStats.percentage}%, rgba(255,255,255,0.05) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0c1322', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                🏁
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Cards Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Total de Exercícios Concluídos</p>
              <h3 style={{ fontSize: '1.5rem', margin: '4px 0 0 0' }}>{stats.totalCompleted}</h3>
            </div>
          </div>
          
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-secondary)' }}>
              <Weight size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Peso Atual</p>
              <h3 style={{ fontSize: '1.5rem', margin: '4px 0 0 0' }}>
                {stats.latestMeasurements.find(m => m.type === 'current')?.weight || '--'} kg
              </h3>
            </div>
          </div>

          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
              <Target size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Meta de Peso</p>
              <h3 style={{ fontSize: '1.5rem', margin: '4px 0 0 0' }}>
                {stats.latestMeasurements.find(m => m.type === 'target')?.weight || '--'} kg
              </h3>
            </div>
          </div>
        </div>

        {/* TAB CONTENT: 1. MEU TREINO */}
        {activeTab === 'workout' && (
          <div className="animate-fade-in">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} style={{ color: 'var(--color-primary)' }} /> Rotina de Exercícios Planejada
            </h3>

            {loadingWorkout ? (
              <p style={{ color: 'var(--text-secondary)' }}>Carregando seus treinos...</p>
            ) : workouts.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h4>Nenhum treino planejado ainda.</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Seu Personal Rodrigo ou Amanda irá cadastrar sua rotina em breve!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {workouts.map((workout) => (
                  <div key={workout.id} className="glass-card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ color: 'var(--color-primary)', fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                      {workout.name}
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {workout.exercises.map((ex) => {
                        const isCompleted = completedExerciseIds.includes(ex.id);
                        return (
                          <div
                            key={ex.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.4)',
                              border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-light)',
                              padding: '1rem',
                              borderRadius: 'var(--border-radius-sm)',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                              <button
                                onClick={() => handleToggleComplete(ex.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: isCompleted ? 'var(--color-primary)' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <CheckCircle size={26} fill={isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'none'} />
                              </button>
                              
                              <div>
                                <h5 style={{
                                  margin: 0,
                                  fontSize: '1rem',
                                  textDecoration: isCompleted ? 'line-through' : 'none',
                                  color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)'
                                }}>
                                  {ex.name}
                                </h5>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {ex.sets} séries x {ex.reps} repetições {ex.weight ? ` | Carga: ${ex.weight}` : ''}
                                </p>
                                {ex.notes && (
                                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>
                                    💡 {ex.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleRequestChange(ex.name)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', gap: '0.25rem' }}
                            >
                              Solicitar Troca
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: 2. DIETA */}
        {activeTab === 'diet' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Apple size={20} style={{ color: 'var(--color-secondary)' }} /> Plano Alimentar Personalizado
              </h3>
              
              {!meals.length && (
                <button
                  onClick={handleRequestDiet}
                  className="btn btn-cyan"
                  disabled={dietRequested || requestingDiet}
                >
                  {dietRequested ? 'Dieta Solicitada' : 'Solicitar Dieta ao Personal'}
                </button>
              )}
            </div>

            {meals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <HelpCircle size={48} style={{ color: dietExpired ? 'var(--color-danger)' : 'var(--text-muted)', marginBottom: '1rem' }} />
                {dietExpired ? (
                  <>
                    <h4 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>Sua Dieta Expirou!</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                      A sua dieta anterior era válida até <strong>{dietValidUntil}</strong> e foi expirada. Solicite uma atualização ao seu Personal.
                    </p>
                    <button
                      onClick={handleRequestDiet}
                      className="btn btn-cyan"
                      disabled={dietRequested || requestingDiet}
                    >
                      {dietRequested ? 'Nova Dieta Solicitada' : 'Solicitar Atualização de Dieta'}
                    </button>
                  </>
                ) : (
                  <>
                    <h4>Nenhuma dieta cadastrada.</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      {dietRequested
                        ? 'Seu pedido já foi enviado! O Personal Trainer está montando seu plano alimentar.'
                        : 'Você pode solicitar uma dieta personalizada ao seu personal clicando no botão acima.'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {dietValidUntil && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', display: 'inline-block' }}>
                    🗓️ Dieta válida até: <strong>{dietValidUntil}</strong>
                  </div>
                )}
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    style={{
                      display: 'flex',
                      gap: '1.5rem',
                      background: 'rgba(15, 23, 42, 0.4)',
                      padding: '1.25rem',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-light)',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      fontWeight: 800,
                      color: 'var(--color-secondary)',
                      fontSize: '1rem',
                      minWidth: '70px',
                      background: 'rgba(6, 182, 212, 0.1)',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      {meal.meal_time}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{meal.meal_name}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {meal.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: 3. EVOLUTION (MEASUREMENTS OVERVIEW) */}
        {activeTab === 'evolution' && (
          <div className="glass-card animate-fade-in">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} /> Evolução de Medidas & Metas Mensais
            </h3>

            {measurements.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Nenhum registro de evolução inserido pelo seu Personal ainda.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {measurements.map((m) => (
                  <div
                    key={m.id}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      borderLeft: m.type === 'target' ? '4px solid var(--color-primary)' : '4px solid var(--color-secondary)',
                      background: 'rgba(10, 15, 28, 0.4)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span className="badge" style={{
                        background: m.type === 'target' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: m.type === 'target' ? 'var(--color-primary)' : 'var(--color-secondary)'
                      }}>
                        {m.type === 'target' ? 'Minha Meta' : 'Medição Atual'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {m.date}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Peso</span>
                        <span style={{ fontWeight: 600 }}>{m.weight} kg</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Altura</span>
                        <span style={{ fontWeight: 600 }}>{m.height} m</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Gordura Corporal</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{m.body_fat}%</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Massa Muscular</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{m.muscle_mass} kg</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Tórax</span>
                        <span style={{ fontWeight: 600 }}>{m.chest} cm</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cintura</span>
                        <span style={{ fontWeight: 600 }}>{m.waist} cm</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Quadril</span>
                        <span style={{ fontWeight: 600 }}>{m.hips} cm</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Braço</span>
                        <span style={{ fontWeight: 600 }}>{m.arms} cm</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Coxa</span>
                        <span style={{ fontWeight: 600 }}>{m.legs} cm</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: 4. CHAT MESSENGER */}
        {activeTab === 'chat' && (
          <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '550px' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                <h4 style={{ margin: 0 }}>Canal de Mensagens com Personal</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tire dúvidas ou solicite troca de treinos</p>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(10, 15, 28, 0.3)' }}>
                {chatMessages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Inicie a conversa enviando uma mensagem abaixo.</p>
                ) : (
                  chatMessages.map((msg) => {
                    const isSentByMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble ${isSentByMe ? 'message-sent' : 'message-received'}`}
                      >
                        {msg.request_type === 'exercise_change' && (
                          <span className="request-badge">🔄 Solicitação de Troca de Exercício</span>
                        )}
                        <div>{msg.content}</div>
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Escreva sua mensagem..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem' }} disabled={sendingMsg}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 5. STUDENT PROFILE EDIT */}
        {activeTab === 'profile' && (
          <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} /> Personalizar Meu Perfil
            </h3>

            {profileMessage && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-primary)', color: '#a7f3d0', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                {profileMessage}
              </div>
            )}
            {profileError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', color: '#fca5a5', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              {/* Photo setup preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {profilePic ? (
                  <img src={profilePic} alt={profileName} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold' }}>
                    {profileName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ marginBottom: '0.25rem' }}>Foto de Perfil (URL da Imagem ou Base64)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    value={profilePic}
                    onChange={(e) => setProfilePic(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="input-field" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input type="email" className="input-field" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input type="text" className="input-field" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Alterar Senha (deixe vazio para manter a atual)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Preencha apenas se for redefinir sua senha"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }} disabled={updatingProfile}>
                {updatingProfile ? 'Salvando Alterações...' : 'Salvar Perfil'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
