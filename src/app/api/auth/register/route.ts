import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { phone, email, password, name } = await req.json();

    if (!phone || !email || !password || !name) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    // Check if phone or email already exists
    const checkUser = await query('SELECT * FROM users WHERE phone = $1 OR email = $2', [phone, email]);
    if (checkUser.rowCount! > 0) {
      return NextResponse.json({ error: 'Telefone ou E-mail já cadastrado.' }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Insert user
    const insertRes = await query(
      'INSERT INTO users (phone, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, phone, email, name, role, profile_picture',
      [phone, email, passwordHash, name, 'student']
    );

    const newUser = insertRes.rows[0];

    // Link student to all available Personal Trainers
    const personals = await query("SELECT id FROM users WHERE role = 'personal'");
    for (const personal of personals.rows) {
      await query(
        'INSERT INTO personal_students (personal_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [personal.id, newUser.id]
      );
    }

    const authUser = {
      id: newUser.id,
      phone: newUser.phone,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      profile_picture: newUser.profile_picture
    };

    const token = signToken(authUser);

    const response = NextResponse.json({
      message: 'Cadastro efetuado com sucesso.',
      user: authUser
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
