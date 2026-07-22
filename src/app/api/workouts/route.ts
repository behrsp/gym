import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

// Fetch workouts and exercises
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let studentId = user.role === 'student' ? user.id : parseInt(searchParams.get('studentId') || '');

  if (!studentId) {
    return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
  }

  try {
    // If personal, verify relationship
    if (user.role === 'personal') {
      const relation = await query(
        'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
        [user.id, studentId]
      );
      if (relation.rowCount === 0) {
        return NextResponse.json({ error: 'Acesso negado. Aluno não vinculado.' }, { status: 403 });
      }
    }

    // Fetch workouts
    const workoutsRes = await query(
      'SELECT id, name, created_at FROM workouts WHERE student_id = $1 ORDER BY id ASC',
      [studentId]
    );

    const workouts = workoutsRes.rows;

    // Fetch exercises for each workout
    for (const workout of workouts) {
      const exercisesRes = await query(
        'SELECT id, name, sets, reps, weight, notes FROM exercises WHERE workout_id = $1 ORDER BY id ASC',
        [workout.id]
      );
      workout.exercises = exercisesRes.rows;
    }

    return NextResponse.json({ workouts });
  } catch (err: any) {
    console.error('Error fetching workouts:', err);
    return NextResponse.json({ error: 'Erro ao buscar treinos.' }, { status: 500 });
  }
}

// Create workout + exercises (Personal only)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const { studentId, name, exercises } = await req.json();

    if (!studentId || !name || !Array.isArray(exercises)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // Verify relationship
    const relation = await query(
      'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
      [user.id, studentId]
    );
    if (relation.rowCount === 0) {
      return NextResponse.json({ error: 'Aluno não vinculado a este personal.' }, { status: 403 });
    }

    // Insert Workout
    const workoutRes = await query(
      'INSERT INTO workouts (student_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [studentId, name]
    );
    const newWorkout = workoutRes.rows[0];

    // Insert exercises
    const newExercises = [];
    for (const ex of exercises) {
      const exRes = await query(
        'INSERT INTO exercises (workout_id, name, sets, reps, weight, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, sets, reps, weight, notes',
        [newWorkout.id, ex.name, parseInt(ex.sets) || 0, ex.reps || '', ex.weight || '', ex.notes || '']
      );
      newExercises.push(exRes.rows[0]);
    }

    newWorkout.exercises = newExercises;

    return NextResponse.json({
      message: 'Treino criado com sucesso.',
      workout: newWorkout
    });
  } catch (err: any) {
    console.error('Error creating workout:', err);
    return NextResponse.json({ error: 'Erro ao criar treino.' }, { status: 500 });
  }
}
