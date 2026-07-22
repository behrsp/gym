import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

// Get measurements logs
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
    // If personal, verify relationship
    if (user.role === 'personal') {
      const relation = await query(
        'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
        [user.id, studentId]
      );
      if (relation.rowCount === 0) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    const res = await query(
      `SELECT id, date::text, type, weight, height, body_fat, muscle_mass, chest, waist, hips, arms, legs
       FROM measurements
       WHERE student_id = $1
       ORDER BY date DESC, type ASC`,
      [studentId]
    );

    return NextResponse.json({ measurements: res.rows });
  } catch (err: any) {
    console.error('Error fetching measurements:', err);
    return NextResponse.json({ error: 'Erro ao buscar medidas.' }, { status: 500 });
  }
}

// Add/Update measurement (Personal only)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const {
      studentId,
      date,
      type,
      weight,
      height,
      body_fat,
      muscle_mass,
      chest,
      waist,
      hips,
      arms,
      legs
    } = await req.json();

    if (!studentId || !date || !type) {
      return NextResponse.json({ error: 'ID do aluno, data e tipo são obrigatórios.' }, { status: 400 });
    }

    if (type !== 'current' && type !== 'target') {
      return NextResponse.json({ error: 'Tipo de medida inválido.' }, { status: 400 });
    }

    // Verify relation
    const relation = await query(
      'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
      [user.id, studentId]
    );
    if (relation.rowCount === 0) {
      return NextResponse.json({ error: 'Aluno não vinculado.' }, { status: 403 });
    }

    // Check if measurement for same student, date and type already exists
    const checkExist = await query(
      'SELECT id FROM measurements WHERE student_id = $1 AND date = $2 AND type = $3',
      [studentId, date, type]
    );

    let res;
    if (checkExist.rowCount! > 0) {
      // Update
      res = await query(
        `UPDATE measurements
         SET weight = $1, height = $2, body_fat = $3, muscle_mass = $4,
             chest = $5, waist = $6, hips = $7, arms = $8, legs = $9
         WHERE student_id = $10 AND date = $11 AND type = $12
         RETURNING *`,
        [
          weight || null,
          height || null,
          body_fat || null,
          muscle_mass || null,
          chest || null,
          waist || null,
          hips || null,
          arms || null,
          legs || null,
          studentId,
          date,
          type
        ]
      );
    } else {
      // Insert
      res = await query(
        `INSERT INTO measurements
         (student_id, date, type, weight, height, body_fat, muscle_mass, chest, waist, hips, arms, legs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          studentId,
          date,
          type,
          weight || null,
          height || null,
          body_fat || null,
          muscle_mass || null,
          chest || null,
          waist || null,
          hips || null,
          arms || null,
          legs || null
        ]
      );
    }

    return NextResponse.json({
      message: 'Medidas salvas com sucesso.',
      measurement: res.rows[0]
    });
  } catch (err: any) {
    console.error('Error saving measurements:', err);
    return NextResponse.json({ error: 'Erro ao salvar medidas.' }, { status: 500 });
  }
}

// Delete measurement (Personal only)
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json({ error: 'ID da medida é obrigatório.' }, { status: 400 });
    }

    // Verify access via cascading checks
    const checkEx = await query(
      `SELECT m.id FROM measurements m
       JOIN personal_students ps ON ps.student_id = m.student_id
       WHERE m.id = $1 AND ps.personal_id = $2`,
      [id, user.id]
    );

    if (checkEx.rowCount === 0) {
      return NextResponse.json({ error: 'Medida não encontrada ou acesso negado.' }, { status: 404 });
    }

    await query('DELETE FROM measurements WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Medida excluída com sucesso.' });
  } catch (err: any) {
    console.error('Error deleting measurement:', err);
    return NextResponse.json({ error: 'Erro ao excluir medida.' }, { status: 500 });
  }
}
