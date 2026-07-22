import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Edit student details (including password and profile picture) by Personal Trainer
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const studentId = parseInt(params.id);
    const { name, email, phone, password, profile_picture } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios.' }, { status: 400 });
    }

    // Verify if student belongs to this personal
    const checkRelation = await query(
      'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
      [user.id, studentId]
    );
    if (checkRelation.rowCount === 0) {
      return NextResponse.json({ error: 'Aluno não vinculado a este personal.' }, { status: 404 });
    }

    // Check unique constraints on phone/email
    const checkUnique = await query(
      'SELECT id FROM users WHERE (phone = $1 OR (email IS NOT NULL AND email = $2)) AND id != $3',
      [phone, email || '', studentId]
    );
    if (checkUnique.rowCount! > 0) {
      return NextResponse.json({ error: 'Telefone ou e-mail já cadastrado por outro usuário.' }, { status: 400 });
    }

    let queryStr = 'UPDATE users SET name = $1, email = $2, phone = $3';
    const dbParams: any[] = [name, email || null, phone];
    let paramIndex = 4;

    if (profile_picture !== undefined) {
      queryStr += `, profile_picture = $${paramIndex++}`;
      dbParams.push(profile_picture);
    }

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      queryStr += `, password_hash = $${paramIndex++}`;
      dbParams.push(hash);
    }

    queryStr += ` WHERE id = $${paramIndex} RETURNING id, phone, email, name, profile_picture`;
    dbParams.push(studentId);

    const updateRes = await query(queryStr, dbParams);

    return NextResponse.json({
      message: 'Aluno atualizado com sucesso.',
      student: updateRes.rows[0]
    });
  } catch (err: any) {
    console.error('Error updating student:', err);
    return NextResponse.json({ error: 'Erro ao atualizar aluno.' }, { status: 500 });
  }
}

// Delete student by Personal Trainer
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const studentId = parseInt(params.id);

    // Verify if student belongs to this personal
    const checkRelation = await query(
      'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
      [user.id, studentId]
    );
    if (checkRelation.rowCount === 0) {
      return NextResponse.json({ error: 'Aluno não vinculado a este personal.' }, { status: 404 });
    }

    // Delete student (cascade triggers will clean up workouts, exercises, messages, measurements, diets)
    await query('DELETE FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);

    return NextResponse.json({ message: 'Aluno removido com sucesso.' });
  } catch (err: any) {
    console.error('Error deleting student:', err);
    return NextResponse.json({ error: 'Erro ao deletar aluno.' }, { status: 500 });
  }
}
