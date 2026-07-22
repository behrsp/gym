import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

// Get messages for a chat session
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
    // Verify access
    if (user.role === 'personal') {
      const relation = await query(
        'SELECT 1 FROM personal_students WHERE personal_id = $1 AND student_id = $2',
        [user.id, studentId]
      );
      if (relation.rowCount === 0) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    // Fetch messages involving the student, joining with sender names
    const res = await query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.request_type, m.created_at,
              u_send.name as sender_name, u_send.role as sender_role,
              u_recv.name as receiver_name, u_recv.role as receiver_role
       FROM messages m
       JOIN users u_send ON m.sender_id = u_send.id
       JOIN users u_recv ON m.receiver_id = u_recv.id
       WHERE (m.sender_id = $1 OR m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [studentId]
    );

    // Mark received messages as read
    await query(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = $1 AND is_read = FALSE',
      [user.id]
    );

    return NextResponse.json({ messages: res.rows });
  } catch (err: any) {
    console.error('Error fetching messages:', err);
    return NextResponse.json({ error: 'Erro ao carregar mensagens.' }, { status: 500 });
  }
}

// Send a message
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { studentId, receiverId, content, requestType } = await req.json();

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'A mensagem não pode ser vazia.' }, { status: 400 });
    }

    let senderId = user.id;
    let finalReceiverId: number;

    if (user.role === 'personal') {
      // Personal sending to student
      if (!studentId) {
        return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
      }
      finalReceiverId = studentId;
    } else {
      // Student sending to personal
      if (receiverId) {
        finalReceiverId = receiverId;
      } else {
        // Find default personal trainer linked to this student
        const personals = await query(
          'SELECT personal_id FROM personal_students WHERE student_id = $1 LIMIT 1',
          [user.id]
        );
        if (personals.rowCount === 0) {
          // If no linked trainer, find any personal trainer in system
          const anyPersonal = await query("SELECT id FROM users WHERE role = 'personal' LIMIT 1");
          if (anyPersonal.rowCount === 0) {
            return NextResponse.json({ error: 'Nenhum personal trainer disponível no sistema.' }, { status: 404 });
          }
          finalReceiverId = anyPersonal.rows[0].id;
        } else {
          finalReceiverId = personals.rows[0].personal_id;
        }
      }
    }

    // Double check receiver exists
    const checkUser = await query('SELECT id, name FROM users WHERE id = $1', [finalReceiverId]);
    if (checkUser.rowCount === 0) {
      return NextResponse.json({ error: 'Destinatário não encontrado.' }, { status: 404 });
    }

    // Insert message
    const res = await query(
      `INSERT INTO messages (sender_id, receiver_id, content, request_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id, receiver_id, content, is_read, request_type, created_at`,
      [senderId, finalReceiverId, content, requestType || null]
    );

    const newMessage = res.rows[0];
    newMessage.sender_name = user.name;
    newMessage.sender_role = user.role;

    return NextResponse.json({
      message: 'Mensagem enviada com sucesso.',
      chatMessage: newMessage
    });
  } catch (err: any) {
    console.error('Error sending message:', err);
    return NextResponse.json({ error: 'Erro ao enviar mensagem.' }, { status: 500 });
  }
}
