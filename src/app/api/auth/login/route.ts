import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'Telefone e senha são obrigatórios.' }, { status: 400 });
    }

    // Find user
    const res = await query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 });
    }

    const user = res.rows[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    const authUser = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      profile_picture: user.profile_picture
    };

    const token = signToken(authUser);

    const response = NextResponse.json({
      message: 'Login realizado com sucesso.',
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
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
