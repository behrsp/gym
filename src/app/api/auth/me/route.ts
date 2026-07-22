import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, signToken } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { name, email, phone, profile_picture, password } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios.' }, { status: 400 });
    }

    // Check unique constraints if phone/email are changing
    if (phone !== user.phone || (email && email !== user.email)) {
      const checkRes = await query(
        'SELECT id FROM users WHERE (phone = $1 OR (email IS NOT NULL AND email = $2)) AND id != $3',
        [phone, email || '', user.id]
      );
      if (checkRes.rowCount! > 0) {
        return NextResponse.json({ error: 'Telefone ou e-mail já cadastrado por outro usuário.' }, { status: 400 });
      }
    }

    let queryStr = 'UPDATE users SET name = $1, email = $2, phone = $3';
    const params: any[] = [name, email || null, phone];

    let paramIndex = 4;

    if (profile_picture !== undefined) {
      queryStr += `, profile_picture = $${paramIndex++}`;
      params.push(profile_picture);
    }

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      queryStr += `, password_hash = $${paramIndex++}`;
      params.push(hash);
    }

    queryStr += ` WHERE id = $${paramIndex} RETURNING id, phone, email, name, role, profile_picture`;
    params.push(user.id);

    const updateRes = await query(queryStr, params);
    const updatedUser = updateRes.rows[0];

    const authUser = {
      id: updatedUser.id,
      phone: updatedUser.phone,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      profile_picture: updatedUser.profile_picture
    };

    const token = signToken(authUser);
    const response = NextResponse.json({
      message: 'Perfil atualizado com sucesso.',
      user: authUser
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return response;
  } catch (err: any) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
