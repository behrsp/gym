import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Acesso negado. Apenas alunos.' }, { status: 403 });
  }

  try {
    // Set diet_requested flag to TRUE
    await query('UPDATE users SET diet_requested = TRUE WHERE id = $1', [user.id]);
    return NextResponse.json({ message: 'Solicitação de dieta enviada com sucesso.' });
  } catch (err: any) {
    console.error('Error requesting diet:', err);
    return NextResponse.json({ error: 'Erro ao solicitar dieta.' }, { status: 500 });
  }
}
