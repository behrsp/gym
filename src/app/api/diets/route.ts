import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

// Ensure table columns are correct
async function ensureColumns() {
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS diet_requested BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS diet_valid_until DATE DEFAULT NULL');
  } catch (err) {
    console.error('Error altering users table for diets:', err);
  }
}

// Fetch diet plan for a student
export async function GET(req: NextRequest) {
  await ensureColumns();
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
    // Check access
    if (user.role === 'personal') {
      const relation = await query(
        'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
        [user.id, studentId]
      );
      if (relation.rowCount === 0) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    // Get diet request and validity status from user
    const studentRes = await query('SELECT diet_requested, diet_valid_until::text FROM users WHERE id = $1', [studentId]);
    const studentInfo = studentRes.rows[0];
    const dietRequested = studentInfo?.diet_requested || false;
    const dietValidUntil = studentInfo?.diet_valid_until || null;

    // Check if diet is expired
    let expired = false;
    if (dietValidUntil) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (dietValidUntil < todayStr) {
        expired = true;
      }
    }

    // Get meals from DB
    const mealsRes = await query(
      'SELECT id, meal_time, meal_name, description FROM diets WHERE student_id = $1 ORDER BY meal_time ASC',
      [studentId]
    );

    let meals = mealsRes.rows;

    // If student and diet is expired, clear meals in response (limpa a dieta do aluno)
    if (user.role === 'student' && expired) {
      meals = [];
    }

    return NextResponse.json({
      dietRequested,
      dietValidUntil,
      expired,
      meals
    });
  } catch (err: any) {
    console.error('Error fetching diet:', err);
    return NextResponse.json({ error: 'Erro ao buscar dieta.' }, { status: 500 });
  }
}

// Save entire diet plan for student (Personal only)
export async function POST(req: NextRequest) {
  await ensureColumns();
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const { studentId, meals, validUntil } = await req.json();

    if (!studentId || !Array.isArray(meals)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // Verify relation
    const relation = await query(
      'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
      [user.id, studentId]
    );
    if (relation.rowCount === 0) {
      return NextResponse.json({ error: 'Aluno não vinculado.' }, { status: 403 });
    }

    // Delete current meals
    await query('DELETE FROM diets WHERE student_id = $1', [studentId]);

    // Insert new meals
    const savedMeals = [];
    for (const meal of meals) {
      const mealRes = await query(
        'INSERT INTO diets (student_id, meal_time, meal_name, description) VALUES ($1, $2, $3, $4) RETURNING id, meal_time, meal_name, description',
        [studentId, meal.meal_time, meal.meal_name, meal.description]
      );
      savedMeals.push(mealRes.rows[0]);
    }

    // Reset diet requested flag and set validity date
    const finalValidUntil = validUntil || null;
    await query(
      'UPDATE users SET diet_requested = FALSE, diet_valid_until = $1 WHERE id = $2',
      [finalValidUntil, studentId]
    );

    return NextResponse.json({
      message: 'Dieta salva com sucesso.',
      dietValidUntil: finalValidUntil,
      meals: savedMeals
    });
  } catch (err: any) {
    console.error('Error saving diet:', err);
    return NextResponse.json({ error: 'Erro ao salvar dieta.' }, { status: 500 });
  }
}

// Clear/Delete entire diet plan for student (Personal only)
export async function DELETE(req: NextRequest) {
  await ensureColumns();
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = parseInt(searchParams.get('studentId') || '');

    if (!studentId) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    // Verify relation
    const relation = await query(
      'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
      [user.id, studentId]
    );
    if (relation.rowCount === 0) {
      return NextResponse.json({ error: 'Aluno não vinculado.' }, { status: 403 });
    }

    // Delete meals
    await query('DELETE FROM diets WHERE student_id = $1', [studentId]);

    // Reset fields in users
    await query(
      'UPDATE users SET diet_requested = FALSE, diet_valid_until = NULL WHERE id = $1',
      [studentId]
    );

    return NextResponse.json({
      message: 'Dieta excluída com sucesso.'
    });
  } catch (err: any) {
    console.error('Error deleting diet:', err);
    return NextResponse.json({ error: 'Erro ao excluir dieta.' }, { status: 500 });
  }
}
