import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Get list of students for this personal trainer
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const res = await query(
      `SELECT u.id, u.phone, u.email, u.name, u.profile_picture, u.created_at
       FROM users u
       JOIN personal_students ps ON ps.student_id = u.id
       WHERE ps.personal_id = $1 AND u.role = 'student'
       ORDER BY u.name ASC`,
      [user.id]
    );

    return NextResponse.json({ students: res.rows });
  } catch (err: any) {
    console.error('Error fetching students:', err);
    return NextResponse.json({ error: 'Erro ao buscar alunos.' }, { status: 500 });
  }
}

// Create user (student or personal) by personal trainer
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'personal') {
    return NextResponse.json({ error: 'Acesso negado. Apenas personal trainers.' }, { status: 403 });
  }

  try {
    const { name, email, phone, password, role } = await req.json();

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    // Check unique
    const checkRes = await query('SELECT id FROM users WHERE phone = $1 OR email = $2', [phone, email]);
    if (checkRes.rowCount! > 0) {
      return NextResponse.json({ error: 'Telefone ou e-mail já cadastrado.' }, { status: 400 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const userRole = role === 'personal' ? 'personal' : 'student';
    
    const insertRes = await query(
      'INSERT INTO users (phone, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, phone, email, name, role',
      [phone, email, hash, name, userRole]
    );

    const newUser = insertRes.rows[0];

    if (userRole === 'student') {
      // Link student to this personal trainer
      await query(
        'INSERT INTO personal_students (personal_id, student_id) VALUES ($1, $2)',
        [user.id, newUser.id]
      );

      // Also link to other trainers so both have access
      const otherPersonals = await query("SELECT id FROM users WHERE role = 'personal' AND id != $1", [user.id]);
      for (const other of otherPersonals.rows) {
        await query(
          'INSERT INTO personal_students (personal_id, student_id) VALUES ($1, $2)',
          [other.id, newUser.id]
        );
      }
    }

    return NextResponse.json({
      message: userRole === 'personal' ? 'Personal Trainer cadastrado com sucesso.' : 'Aluno criado com sucesso.',
      student: newUser
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
  }
}
