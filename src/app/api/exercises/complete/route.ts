import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

// Get list of exercise IDs completed today by the student
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = user.role === 'student' ? user.id : parseInt(searchParams.get('studentId') || '');

  if (!studentId) {
    return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
  }

  try {
    const res = await query(
      `SELECT exercise_id FROM completed_exercises
       WHERE student_id = $1 AND completed_at::date = CURRENT_DATE`,
      [studentId]
    );

    const completedIds = res.rows.map((row) => row.exercise_id);
    return NextResponse.json({ completedIds });
  } catch (err: any) {
    console.error('Error fetching completed exercises:', err);
    return NextResponse.json({ error: 'Erro ao buscar exercícios concluídos.' }, { status: 500 });
  }
}

// Toggle completion of an exercise (Student only)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Acesso negado. Apenas alunos podem concluir exercícios.' }, { status: 403 });
  }

  try {
    const { exerciseId } = await req.json();

    if (!exerciseId) {
      return NextResponse.json({ error: 'ID do exercício é obrigatório.' }, { status: 400 });
    }

    // Verify exercise exists
    const checkEx = await query('SELECT id FROM exercises WHERE id = $1', [exerciseId]);
    if (checkEx.rowCount === 0) {
      return NextResponse.json({ error: 'Exercício não encontrado.' }, { status: 404 });
    }

    // Check if already completed today
    const checkCompleted = await query(
      `SELECT id FROM completed_exercises
       WHERE student_id = $1 AND exercise_id = $2 AND completed_at::date = CURRENT_DATE`,
      [user.id, exerciseId]
    );

    if (checkCompleted.rowCount! > 0) {
      // Uncomplete (Delete)
      await query(
        `DELETE FROM completed_exercises
         WHERE student_id = $1 AND exercise_id = $2 AND completed_at::date = CURRENT_DATE`,
        [user.id, exerciseId]
      );
      return NextResponse.json({ completed: false, message: 'Exercício desmarcado como concluído.' });
    } else {
      // Complete (Insert)
      await query(
        `INSERT INTO completed_exercises (student_id, exercise_id)
         VALUES ($1, $2)`,
        [user.id, exerciseId]
      );
      return NextResponse.json({ completed: true, message: 'Exercício marcado como concluído.' });
    }
  } catch (err: any) {
    console.error('Error toggling exercise completion:', err);
    return NextResponse.json({ error: 'Erro ao processar conclusão do exercício.' }, { status: 500 });
  }
}
