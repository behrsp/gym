import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

// Edit workout name and its exercises (Personal only)
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const workoutId = parseInt(params.id);
    const { name, exercises } = await req.json();

    if (!name || !Array.isArray(exercises)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // Verify workout existence & access
    const checkWorkout = await query(
      `SELECT w.id, w.student_id FROM workouts w
       JOIN personal_students ps ON ps.student_id = w.student_id
       WHERE w.id = $1 AND ps.personal_id = $2`,
      [workoutId, user.id]
    );

    if (checkWorkout.rowCount === 0) {
      return NextResponse.json({ error: 'Treino não encontrado ou acesso negado.' }, { status: 404 });
    }

    // Update workout name
    await query('UPDATE workouts SET name = $1 WHERE id = $2', [name, workoutId]);

    // Delete old exercises
    await query('DELETE FROM exercises WHERE workout_id = $1', [workoutId]);

    // Insert new exercises
    const updatedExercises = [];
    for (const ex of exercises) {
      const exRes = await query(
        'INSERT INTO exercises (workout_id, name, sets, reps, weight, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, sets, reps, weight, notes',
        [workoutId, ex.name, parseInt(ex.sets) || 0, ex.reps || '', ex.weight || '', ex.notes || '']
      );
      updatedExercises.push(exRes.rows[0]);
    }

    return NextResponse.json({
      message: 'Treino atualizado com sucesso.',
      workout: {
        id: workoutId,
        name,
        exercises: updatedExercises
      }
    });
  } catch (err: any) {
    console.error('Error updating workout:', err);
    return NextResponse.json({ error: 'Erro ao atualizar treino.' }, { status: 500 });
  }
}

// Delete workout (Personal only)
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const workoutId = parseInt(params.id);

    // Verify workout existence & access
    const checkWorkout = await query(
      `SELECT w.id FROM workouts w
       JOIN personal_students ps ON ps.student_id = w.student_id
       WHERE w.id = $1 AND ps.personal_id = $2`,
      [workoutId, user.id]
    );

    if (checkWorkout.rowCount === 0) {
      return NextResponse.json({ error: 'Treino não encontrado ou acesso negado.' }, { status: 404 });
    }

    // Delete workout (exercises will cascade delete)
    await query('DELETE FROM workouts WHERE id = $1', [workoutId]);

    return NextResponse.json({ message: 'Treino excluído com sucesso.' });
  } catch (err: any) {
    console.error('Error deleting workout:', err);
    return NextResponse.json({ error: 'Erro ao excluir treino.' }, { status: 500 });
  }
}
