'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Lock,
  ChevronRight,
  Send,
  PlusCircle,
  Apple,
  FileText,
  UserCheck,
  LogOut
} from 'lucide-react';

interface Student {
  id: number;
  phone: string;
  email: string | null;
  name: string;
  profile_picture: string | null;
  created_at: string;
}

interface Exercise {
  id?: number;
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
  id?: number;
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

export default function PersonalDashboard() {
  const { user, logout } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'students' | 'messages' | 'measurements'>('students');

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingDiets: 0,
    unreadMessages: 0,
    studentCompletionsToday: 0
  });

  // Students list
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Selected student details (for manage exercises & diet & profiles modal)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [diets, setDiets] = useState<Meal[]>([]);
  const [dietRequested, setDietRequested] = useState(false);

  // Edit student modal state
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editProfilePic, setEditProfilePic] = useState('');
  const [updatingStudent, setUpdatingStudent] = useState(false);
  const [editError, setEditError] = useState('');

  // Create student modal state
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'personal'>('student');
  const [createError, setCreateError] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Edit Personal profile state
  const [showEditPersonalModal, setShowEditPersonalModal] = useState(false);
  const [personalName, setPersonalName] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPassword, setPersonalPassword] = useState('');
  const [personalProfilePic, setPersonalProfilePic] = useState('');
  const [updatingPersonal, setUpdatingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');

  // Workout Builder modal state
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutModalType, setWorkoutModalType] = useState<'add' | 'edit'>('add');
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('10');
  const [newExWeight, setNewExWeight] = useState('');
  const [newExNotes, setNewExNotes] = useState('');

  // Diet Builder state
  const [showDietModal, setShowDietModal] = useState(false);
  const [dietMeals, setDietMeals] = useState<Meal[]>([]);
  const [newMealTime, setNewMealTime] = useState('08:00');
  const [newMealName, setNewMealName] = useState('');
  const [newMealDesc, setNewMealDesc] = useState('');

  // Measurements Tab State
  const [measureStudentId, setMeasureStudentId] = useState<number>(0);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [measureType, setMeasureType] = useState<'current' | 'target'>('current');
  const [mWeight, setMWeight] = useState('');
  const [mHeight, setMHeight] = useState('');
  const [mBF, setMBF] = useState('');
  const [mMM, setMMM] = useState('');
  const [mChest, setMChest] = useState('');
  const [mWaist, setMWaist] = useState('');
  const [mHips, setMHips] = useState('');
  const [mArms, setMArms] = useState('');
  const [mLegs, setMLegs] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);

  // Messaging state
  const [activeChatStudentId, setActiveChatStudentId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch Dashboard Stats & Students
  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalStudents: statsData.totalStudents,
          pendingDiets: statsData.pendingDiets,
          unreadMessages: statsData.unreadMessages,
          studentCompletionsToday: statsData.studentCompletionsToday
        });
      }

      const studentsRes = await fetch('/api/students');
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students);
        if (studentsData.students.length > 0 && measureStudentId === 0) {
          setMeasureStudentId(studentsData.students[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats/students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch student detailed data
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    try {
      // Workouts
      const workoutsRes = await fetch(`/api/workouts?studentId=${student.id}`);
      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json();
        setWorkouts(workoutsData.workouts);
      }

      // Diets
      const dietsRes = await fetch(`/api/diets?studentId=${student.id}`);
      if (dietsRes.ok) {
        const dietsData = await dietsRes.json();
        setDiets(dietsData.meals);
        setDietRequested(dietsData.dietRequested);
      }
    } catch (err) {
      console.error('Error fetching student detail data:', err);
    }
  };

  // Open Edit student profile modal
  const openEditStudentModal = (student: Student) => {
    setEditName(student.name);
    setEditPhone(student.phone);
    setEditEmail(student.email || '');
    setEditPassword('');
    setEditProfilePic(student.profile_picture || '');
    setEditError('');
    setShowEditStudentModal(true);
  };

  // Save student profile
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setUpdatingStudent(true);
    setEditError('');

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          password: editPassword || undefined,
          profile_picture: editProfilePic
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowEditStudentModal(false);
        // refresh selected student
        setSelectedStudent(data.student);
        fetchDashboardData();
      } else {
        setEditError(data.error || 'Erro ao atualizar aluno.');
      }
    } catch (err) {
      setEditError('Erro de rede ao atualizar aluno.');
    } finally {
      setUpdatingStudent(false);
    }
  };

  // Create new user (student or personal)
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStudent(true);
    setCreateError('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone,
          password: newPassword,
          role: newRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateStudentModal(false);
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewPassword('');
        setNewRole('student');
        fetchDashboardData();
      } else {
        setCreateError(data.error || 'Erro ao cadastrar usuário.');
      }
    } catch (err) {
      setCreateError('Erro de rede ao cadastrar usuário.');
    } finally {
      setCreatingStudent(false);
    }
  };

  // Personal profile edit handlers
  const openEditPersonalModal = () => {
    if (!user) return;
    setPersonalName(user.name);
    setPersonalPhone(user.phone);
    setPersonalEmail(user.email || '');
    setPersonalPassword('');
    setPersonalProfilePic(user.profile_picture || '');
    setPersonalError('');
    setPersonalMessage('');
    setShowEditPersonalModal(true);
  };

  const handleUpdatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPersonal(true);
    setPersonalError('');
    setPersonalMessage('');

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalName,
          email: personalEmail,
          phone: personalPhone,
          password: personalPassword || undefined,
          profile_picture: personalProfilePic
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPersonalMessage('Perfil atualizado com sucesso!');
        // Trigger page refresh to sync layout state
        window.location.reload();
      } else {
        setPersonalError(data.error || 'Erro ao atualizar perfil.');
      }
    } catch (err) {
      setPersonalError('Erro de rede ao atualizar perfil.');
    } finally {
      setUpdatingPersonal(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este aluno? Todos os treinos, dietas e evolução serão apagados.')) return;
    
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedStudent(null);
        fetchDashboardData();
      } else {
        alert('Erro ao excluir aluno.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // WORKOUT LOGIC
  const openAddWorkoutModal = () => {
    setWorkoutModalType('add');
    setWorkoutName('');
    setWorkoutExercises([]);
    setShowWorkoutModal(true);
  };

  const openEditWorkoutModal = (workout: Workout) => {
    setWorkoutModalType('edit');
    setActiveWorkoutId(workout.id);
    setWorkoutName(workout.name);
    setWorkoutExercises(workout.exercises);
    setShowWorkoutModal(true);
  };

  const addExerciseToBuilder = () => {
    if (!newExName) return;
    const newEx: Exercise = {
      name: newExName,
      sets: parseInt(newExSets) || 3,
      reps: newExReps,
      weight: newExWeight,
      notes: newExNotes
    };
    setWorkoutExercises([...workoutExercises, newEx]);
    setNewExName('');
    setNewExWeight('');
    setNewExNotes('');
  };

  const removeExerciseFromBuilder = (idx: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== idx));
  };

  const handleSaveWorkout = async () => {
    if (!workoutName || !selectedStudent) return;
    try {
      if (workoutModalType === 'add') {
        const res = await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: selectedStudent.id,
            name: workoutName,
            exercises: workoutExercises
          })
        });
        if (res.ok) {
          setShowWorkoutModal(false);
          handleSelectStudent(selectedStudent);
        }
      } else {
        const res = await fetch(`/api/workouts/${activeWorkoutId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workoutName,
            exercises: workoutExercises
          })
        });
        if (res.ok) {
          setShowWorkoutModal(false);
          handleSelectStudent(selectedStudent);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkout = async (workoutId: number) => {
    if (!confirm('Deseja excluir este treino?')) return;
    try {
      const res = await fetch(`/api/workouts/${workoutId}`, { method: 'DELETE' });
      if (res.ok && selectedStudent) {
        handleSelectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // DIET LOGIC
  const openDietBuilderModal = () => {
    setDietMeals(diets);
    setShowDietModal(true);
  };

  const addMealToBuilder = () => {
    if (!newMealName || !newMealDesc) return;
    const newMeal: Meal = {
      meal_time: newMealTime,
      meal_name: newMealName,
      description: newMealDesc
    };
    const updatedMeals = [...dietMeals, newMeal].sort((a, b) => a.meal_time.localeCompare(b.meal_time));
    setDietMeals(updatedMeals);
    setNewMealName('');
    setNewMealDesc('');
  };

  const removeMealFromBuilder = (idx: number) => {
    setDietMeals(dietMeals.filter((_, i) => i !== idx));
  };

  const handleSaveDiet = async () => {
    if (!selectedStudent) return;
    try {
      const res = await fetch('/api/diets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          meals: dietMeals
        })
      });
      if (res.ok) {
        setShowDietModal(false);
        handleSelectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // MEASUREMENTS PROGRESS LOGIC
  const fetchMeasurements = async (studentId: number) => {
    try {
      const res = await fetch(`/api/measurements?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setMeasurements(data.measurements);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'measurements' && measureStudentId) {
      fetchMeasurements(measureStudentId);
    }
  }, [activeTab, measureStudentId]);

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureStudentId) return;
    setSavingMeasurements(true);

    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: measureStudentId,
          date: measureDate,
          type: measureType,
          weight: mWeight,
          height: mHeight,
          body_fat: mBF,
          muscle_mass: mMM,
          chest: mChest,
          waist: mWaist,
          hips: mHips,
          arms: mArms,
          legs: mLegs
        })
      });

      if (res.ok) {
        fetchMeasurements(measureStudentId);
        // Clear measurements form
        setMWeight('');
        setMHeight('');
        setMBF('');
        setMMM('');
        setMChest('');
        setMWaist('');
        setMHips('');
        setMArms('');
        setMLegs('');
      } else {
        alert('Erro ao salvar medidas.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMeasurements(false);
    }
  };

  const handleDeleteMeasurement = async (id: number) => {
    if (!confirm('Deseja excluir este registro de medida?')) return;
    try {
      const res = await fetch(`/api/measurements?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMeasurements(measureStudentId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // MESSAGING SYSTEM
  const fetchMessages = async (studentId: number) => {
    try {
      const res = await fetch(`/api/messages?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages' && activeChatStudentId) {
      fetchMessages(activeChatStudentId);
      const interval = setInterval(() => fetchMessages(activeChatStudentId), 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, activeChatStudentId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatStudentId) return;

    setSendingMsg(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeChatStudentId,
          content: newMessageText
        })
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

  return (
    <div className="dashboard-layout">
      {/* Desktop Sidebar */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <Activity style={{ color: 'var(--color-primary)' }} />
          <span className="gradient-text">GYM EVOLUTION</span>
        </div>
        
        <div className="sidebar-nav">
          <button
            onClick={() => setActiveTab('students')}
            className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
          >
            <Users size={20} />
            Alunos
          </button>
          
          <button
            onClick={() => setActiveTab('measurements')}
            className={`nav-link ${activeTab === 'measurements' ? 'active' : ''}`}
          >
            <TrendingUp size={20} />
            Medidas & Metas
          </button>
          
          <button
            onClick={() => setActiveTab('messages')}
            className={`nav-link ${activeTab === 'messages' ? 'active' : ''}`}
          >
            <MessageSquare size={20} />
            Mensagens
            {stats.unreadMessages > 0 && (
              <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>
                {stats.unreadMessages}
              </span>
            )}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <div 
            onClick={openEditPersonalModal}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '1rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: 'var(--border-radius-sm)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid transparent',
              transition: 'var(--transition-smooth)'
            }}
            title="Editar Meu Perfil"
          >
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
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Editar Perfil ⚙️</p>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', gap: '0.5rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav">
        <button
          onClick={() => setActiveTab('students')}
          className={`mobile-nav-link ${activeTab === 'students' ? 'active' : ''}`}
        >
          <Users size={20} />
          Alunos
        </button>
        
        <button
          onClick={() => setActiveTab('measurements')}
          className={`mobile-nav-link ${activeTab === 'measurements' ? 'active' : ''}`}
        >
          <TrendingUp size={20} />
          Medidas
        </button>
        
        <button
          onClick={() => setActiveTab('messages')}
          className={`mobile-nav-link ${activeTab === 'messages' ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          Mensagens
        </button>
        
        <button
          onClick={logout}
          className="mobile-nav-link"
          style={{ color: 'var(--color-danger)' }}
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header stats overview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Bem vindo, Coach {user?.name.split(' ')[1] || user?.name}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Acompanhe o desempenho e crie rotinas para seus alunos.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowCreateStudentModal(true)} className="btn btn-primary">
              <Plus size={18} /> Novo Aluno
            </button>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alunos Cadastrados</p>
              <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{stats.totalStudents}</h3>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-secondary)' }}>
              <Apple size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Solicitações de Dieta</p>
              <h3 style={{ fontSize: '1.6rem', margin: 0 }}>
                {stats.pendingDiets} 
                {stats.pendingDiets > 0 && <span className="badge badge-primary" style={{ fontSize: '0.65rem', marginLeft: '0.5rem' }}>Ação</span>}
              </h3>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mensagens Não Lidas</p>
              <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{stats.unreadMessages}</h3>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary)' }}>
              <Activity size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Exercícios Feitos Hoje</p>
              <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{stats.studentCompletionsToday}</h3>
            </div>
          </div>
        </div>

        {/* TAB CONTENT: 1. STUDENTS LIST & DETAILS */}
        {activeTab === 'students' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1.2fr 1.8fr' : '1fr', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Student list grid */}
            <div>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} /> Grade de Alunos
              </h3>
              {loadingStudents ? (
                <p style={{ color: 'var(--text-secondary)' }}>Buscando alunos...</p>
              ) : students.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Você não possui alunos vinculados.</p>
                  <button onClick={() => setShowCreateStudentModal(true)} className="btn btn-primary">
                    Cadastrar Aluno
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className={`glass-card ${selectedStudent?.id === student.id ? 'cyan' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: '1rem',
                        borderLeft: selectedStudent?.id === student.id ? '4px solid var(--color-secondary)' : ''
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {student.profile_picture ? (
                          <img src={student.profile_picture} alt={student.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{student.name}</h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.phone}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected student workout and diet details */}
            {selectedStudent && (
              <div className="animate-fade-in">
                <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      {selectedStudent.profile_picture ? (
                        <img src={selectedStudent.profile_picture} alt={selectedStudent.name} className="profile-avatar" style={{ width: '64px', height: '64px' }} />
                      ) : (
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                          {selectedStudent.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0 }}>{selectedStudent.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{selectedStudent.email || 'Sem e-mail cadastrado'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEditStudentModal(selectedStudent)} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
                        <Edit2 size={16} /> Editar Perfil
                      </button>
                      <button onClick={() => handleDeleteStudent(selectedStudent.id)} className="btn btn-danger" style={{ padding: '0.5rem 0.75rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Workouts section */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Treinos Customizados
                      </h4>
                      <button onClick={openAddWorkoutModal} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        <Plus size={14} /> Novo Treino
                      </button>
                    </div>

                    {workouts.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhum treino cadastrado para este aluno.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {workouts.map((workout) => (
                          <div key={workout.id} style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <h5 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--color-primary)' }}>{workout.name}</h5>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button onClick={() => openEditWorkoutModal(workout)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteWorkout(workout.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {workout.exercises.map((ex, idx) => (
                                <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < workout.exercises.length - 1 ? '1px solid rgba(255,255,255,0.03)' : '' }}>
                                  <span>{ex.name}</span>
                                  <span>{ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight})` : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Diets Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Apple size={18} style={{ color: 'var(--color-secondary)' }} /> Dieta Personalizada
                      </h4>
                      <div>
                        {dietRequested && (
                          <span className="badge badge-primary" style={{ marginRight: '0.5rem' }}>
                            Solicitada pelo aluno!
                          </span>
                        )}
                        <button onClick={openDietBuilderModal} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                          Definir Dieta
                        </button>
                      </div>
                    </div>

                    {diets.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhum plano alimentar cadastrado.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {diets.map((diet, idx) => (
                          <div key={diet.id || idx} style={{ display: 'flex', gap: '1rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--color-secondary)', fontSize: '0.9rem', width: '50px' }}>{diet.meal_time}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{diet.meal_name}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{diet.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: 2. MEASUREMENTS & TARGET PROGRESS */}
        {activeTab === 'measurements' && (
          <div className="glass-card animate-fade-in">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} /> Histórico de Medidas & Metas Mensais
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
              {/* Add measurements form */}
              <div>
                <h4 style={{ marginBottom: '1rem' }}>Selecionar Aluno & Lançar Registro</h4>
                <form onSubmit={handleSaveMeasurement}>
                  <div className="form-group">
                    <label className="form-label">Aluno</label>
                    <select
                      className="input-field"
                      value={measureStudentId}
                      onChange={(e) => setMeasureStudentId(parseInt(e.target.value))}
                      required
                    >
                      <option value="">Selecione...</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Data</label>
                      <input
                        type="date"
                        className="input-field"
                        value={measureDate}
                        onChange={(e) => setMeasureDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select
                        className="input-field"
                        value={measureType}
                        onChange={(e) => setMeasureType(e.target.value as any)}
                        required
                      >
                        <option value="current">Atual (Medido)</option>
                        <option value="target">Meta (Objetivo)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Peso (kg)</label>
                      <input type="number" step="0.1" className="input-field" value={mWeight} onChange={(e) => setMWeight(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Altura (m)</label>
                      <input type="number" step="0.01" className="input-field" value={mHeight} onChange={(e) => setMHeight(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Gordura Corporal (%)</label>
                      <input type="number" step="0.1" className="input-field" value={mBF} onChange={(e) => setMBF(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Massa Muscular (kg)</label>
                      <input type="number" step="0.1" className="input-field" value={mMM} onChange={(e) => setMMM(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Tórax (cm)</label>
                      <input type="number" step="0.1" className="input-field" value={mChest} onChange={(e) => setMChest(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cintura (cm)</label>
                      <input type="number" step="0.1" className="input-field" value={mWaist} onChange={(e) => setMWaist(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quadril (cm)</label>
                      <input type="number" step="0.1" className="input-field" value={mHips} onChange={(e) => setMHips(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Braço (cm)</label>
                      <input type="number" step="0.1" className="input-field" value={mArms} onChange={(e) => setMArms(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Coxa (cm)</label>
                      <input type="number" step="0.1" className="input-field" value={mLegs} onChange={(e) => setMLegs(e.target.value)} />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingMeasurements}>
                    {savingMeasurements ? 'Salvando...' : 'Salvar Medida / Meta'}
                  </button>
                </form>
              </div>

              {/* Show measurement history */}
              <div>
                <h4 style={{ marginBottom: '1rem' }}>Linha do Tempo e Metas</h4>
                {measurements.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Nenhuma medida ou meta cadastrada para este aluno.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
                    {measurements.map((m) => (
                      <div key={m.id} className="glass-card" style={{ padding: '1rem', borderLeft: m.type === 'target' ? '4px solid var(--color-primary)' : '4px solid var(--color-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div>
                            <span className="badge badge-secondary" style={{ marginRight: '0.5rem', background: m.type === 'target' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)', color: m.type === 'target' ? 'var(--color-primary)' : 'var(--color-secondary)' }}>
                              {m.type === 'target' ? 'Meta' : 'Medição Atual'}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.date}</span>
                          </div>
                          <button onClick={() => handleDeleteMeasurement(m.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div>⚖️ {m.weight}kg</div>
                          <div>📏 {m.height}m</div>
                          <div>🔥 BF: {m.body_fat}%</div>
                          <div>💪 Muscle: {m.muscle_mass}kg</div>
                          <div>👕 Chest: {m.chest}cm</div>
                          <div>👖 Waist: {m.waist}cm</div>
                          <div>🍑 Hips: {m.hips}cm</div>
                          <div>💪 Arm: {m.arms}cm</div>
                          <div>🦵 Leg: {m.legs}cm</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 3. MESSAGING SYSTEM */}
        {activeTab === 'messages' && (
          <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', height: '600px' }}>
              {/* Chat sidebar: list of students */}
              <div style={{ borderRight: '1px solid var(--border-light)', overflowY: 'auto' }}>
                <h4 style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)', margin: 0 }}>Conversas</h4>
                {students.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => setActiveChatStudentId(st.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      cursor: 'pointer',
                      background: activeChatStudentId === st.id ? 'rgba(255, 255, 255, 0.05)' : '',
                      borderBottom: '1px solid var(--border-light)'
                    }}
                  >
                    {st.profile_picture ? (
                      <img src={st.profile_picture} alt={st.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {st.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{st.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.phone}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat window */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {activeChatStudentId ? (
                  <>
                    {/* Chat Header */}
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h4 style={{ margin: 0 }}>
                        {students.find(st => st.id === activeChatStudentId)?.name}
                      </h4>
                    </div>

                    {/* Chat Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(10, 15, 28, 0.3)' }}>
                      {chatMessages.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Nenhuma mensagem trocada ainda.</p>
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
                        placeholder="Digite sua resposta..."
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem' }} disabled={sendingMsg}>
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Selecione um aluno na barra lateral para abrir a conversa.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE STUDENT MODAL */}
      {showCreateStudentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>
              {newRole === 'personal' ? 'Cadastrar Novo Personal' : 'Cadastrar Novo Aluno'}
            </h3>
            {createError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{createError}</p>}
            <form onSubmit={handleCreateStudent}>
              <div className="form-group">
                <label className="form-label">Tipo de Conta</label>
                <select 
                  className="input-field" 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="student">Aluno</option>
                  <option value="personal">Personal Trainer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="input-field" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input type="email" className="input-field" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input type="text" className="input-field" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Senha Inicial</label>
                <input type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateStudentModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={creatingStudent}>Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT PROFILE MODAL */}
      {showEditStudentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Editar Cadastro do Aluno</h3>
            {editError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{editError}</p>}
            <form onSubmit={handleUpdateStudent}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input type="text" className="input-field" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input type="email" className="input-field" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input type="text" className="input-field" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Alterar Foto de Perfil (URL/Base64)</label>
                <input type="text" className="input-field" value={editProfilePic} onChange={(e) => setEditProfilePic(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Nova Senha (deixe vazio para manter)</label>
                <input type="password" className="input-field" placeholder="Preencha apenas se for alterar" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditStudentModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={updatingStudent}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKOUT BUILDER MODAL */}
      {showWorkoutModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>
              {workoutModalType === 'add' ? 'Adicionar Novo Treino' : 'Editar Treino'}
            </h3>
            
            <div className="form-group">
              <label className="form-label">Nome do Treino</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Treino A - Peito e Tríceps"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>

            {/* Exercise listing */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '0.5rem' }}>Exercícios Incluídos:</h5>
              {workoutExercises.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhum exercício adicionado a este treino.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {workoutExercises.map((ex, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{ex.name}</span>
                        <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight})` : ''}
                        </span>
                      </div>
                      <button onClick={() => removeExerciseFromBuilder(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to add individual exercise */}
            <div style={{ padding: '1rem', background: 'rgba(15,23,42,0.5)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '0.75rem' }}>Adicionar Exercício ao Treino</h5>
              <div className="form-group">
                <label className="form-label">Nome do Exercício</label>
                <input type="text" className="input-field" placeholder="Ex: Supino Reto" value={newExName} onChange={(e) => setNewExName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Séries</label>
                  <input type="number" className="input-field" value={newExSets} onChange={(e) => setNewExSets(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Repetições</label>
                  <input type="text" className="input-field" placeholder="Ex: 10 a 12" value={newExReps} onChange={(e) => setNewExReps(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Carga/Peso</label>
                  <input type="text" className="input-field" placeholder="Ex: 20kg cada lado" value={newExWeight} onChange={(e) => setNewExWeight(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações (opcional)</label>
                <input type="text" className="input-field" placeholder="Ex: Foco no movimento controlado" value={newExNotes} onChange={(e) => setNewExNotes(e.target.value)} />
              </div>
              <button type="button" onClick={addExerciseToBuilder} className="btn btn-secondary" style={{ width: '100%', gap: '0.5rem' }}>
                <PlusCircle size={16} /> Incluir Exercício
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowWorkoutModal(false)} className="btn btn-secondary">Cancelar</button>
              <button type="button" onClick={handleSaveWorkout} className="btn btn-primary" disabled={!workoutName || workoutExercises.length === 0}>
                Salvar Treino Completo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIET BUILDER MODAL */}
      {showDietModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Montar Dieta Personalizada</h3>
            
            {/* Meal listings */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '0.5rem' }}>Refeições Planejadas:</h5>
              {dietMeals.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhuma refeição adicionada ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {dietMeals.map((meal, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>{meal.meal_time}</span>
                        <span style={{ marginLeft: '10px', fontWeight: 600 }}>{meal.meal_name}</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{meal.description}</p>
                      </div>
                      <button onClick={() => removeMealFromBuilder(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to add individual meal */}
            <div style={{ padding: '1rem', background: 'rgba(15,23,42,0.5)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '0.75rem' }}>Adicionar Nova Refeição</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Horário</label>
                  <input type="time" className="input-field" value={newMealTime} onChange={(e) => setNewMealTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome da Refeição</label>
                  <input type="text" className="input-field" placeholder="Ex: Café da Manhã" value={newMealName} onChange={(e) => setNewMealName(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição da Refeição (Alimentos, quantidades, etc.)</label>
                <textarea className="input-field" placeholder="Ex: 3 ovos mexidos, 2 fatias de pão integral, 1 copo de suco" rows={3} value={newMealDesc} onChange={(e) => setNewMealDesc(e.target.value)} />
              </div>
              <button type="button" onClick={addMealToBuilder} className="btn btn-secondary" style={{ width: '100%', gap: '0.5rem' }}>
                <PlusCircle size={16} /> Incluir Refeição
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowDietModal(false)} className="btn btn-secondary">Cancelar</button>
              <button type="button" onClick={handleSaveDiet} className="btn btn-primary" disabled={dietMeals.length === 0}>
                Salvar Dieta Completa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT PERSONAL PROFILE MODAL */}
      {showEditPersonalModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Personalizar Meu Perfil</h3>
            {personalMessage && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-primary)', color: '#a7f3d0', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                {personalMessage}
              </div>
            )}
            {personalError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', color: '#fca5a5', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                {personalError}
              </div>
            )}
            <form onSubmit={handleUpdatePersonal}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {personalProfilePic ? (
                  <img src={personalProfilePic} alt={personalName} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold' }}>
                    {personalName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label className="form-label">Foto de Perfil (URL ou Base64)</label>
                  <input type="text" className="input-field" value={personalProfilePic} onChange={(e) => setPersonalProfilePic(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="input-field" value={personalName} onChange={(e) => setPersonalName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input type="email" className="input-field" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input type="text" className="input-field" value={personalPhone} onChange={(e) => setPersonalPhone(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Nova Senha (deixe vazio para manter)</label>
                <input type="password" className="input-field" placeholder="Preencha apenas se for alterar" value={personalPassword} onChange={(e) => setPersonalPassword(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditPersonalModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={updatingPersonal}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
