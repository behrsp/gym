import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    if (user.role === 'student') {
      // --- Student Stats ---
      // 1. Total exercises completed ever
      const totalCompletedRes = await query(
        'SELECT COUNT(*) as count FROM completed_exercises WHERE student_id = $1',
        [user.id]
      );
      const totalCompleted = parseInt(totalCompletedRes.rows[0]?.count || '0');

      // 2. Completed in the last 7 days (including today)
      const weeklyCompletedRes = await query(
        `SELECT completed_at::date as date, COUNT(*) as count
         FROM completed_exercises
         WHERE student_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY completed_at::date
         ORDER BY completed_at::date ASC`,
        [user.id]
      );
      
      const weeklyData = weeklyCompletedRes.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      }));

      // 3. Today's completions percentage
      // Find today's active workouts
      const todayWorkoutsRes = await query(
        'SELECT id FROM workouts WHERE student_id = $1',
        [user.id]
      );
      const workoutIds = todayWorkoutsRes.rows.map(w => w.id);
      
      let todayTotalExercises = 0;
      let todayCompletedExercises = 0;

      if (workoutIds.length > 0) {
        // Total exercises in student's workouts
        const totalExRes = await query(
          'SELECT COUNT(*) as count FROM exercises WHERE workout_id = ANY($1)',
          [workoutIds]
        );
        todayTotalExercises = parseInt(totalExRes.rows[0]?.count || '0');

        // Completed today
        const completedTodayRes = await query(
          `SELECT COUNT(DISTINCT exercise_id) as count FROM completed_exercises
           WHERE student_id = $1 AND completed_at::date = CURRENT_DATE AND exercise_id IN (
             SELECT id FROM exercises WHERE workout_id = ANY($2)
           )`,
          [user.id, workoutIds]
        );
        todayCompletedExercises = parseInt(completedTodayRes.rows[0]?.count || '0');
      }

      // 4. Evolution of key measurements
      const latestMeasurements = await query(
        `SELECT type, date::text, weight, body_fat, muscle_mass
         FROM measurements
         WHERE student_id = $1
         ORDER BY date DESC, type ASC
         LIMIT 4`,
        [user.id]
      );

      return NextResponse.json({
        role: 'student',
        totalCompleted,
        weeklyData,
        todayStats: {
          total: todayTotalExercises,
          completed: todayCompletedExercises,
          percentage: todayTotalExercises > 0 ? Math.round((todayCompletedExercises / todayTotalExercises) * 100) : 0
        },
        latestMeasurements: latestMeasurements.rows
      });

    } else {
      // --- Personal Trainer Stats ---
      // 1. Total students linked
      const totalStudentsRes = await query(
        'SELECT COUNT(*) as count FROM personal_students WHERE personal_id = $1',
        [user.id]
      );
      const totalStudents = parseInt(totalStudentsRes.rows[0]?.count || '0');

      // 2. Pending diet requests
      const dietRequestsRes = await query(
        `SELECT COUNT(*) as count FROM users u
         JOIN personal_students ps ON ps.student_id = u.id
         WHERE ps.personal_id = $1 AND u.role = 'student' AND u.diet_requested = TRUE`,
        [user.id]
      );
      const pendingDiets = parseInt(dietRequestsRes.rows[0]?.count || '0');

      // 3. Unread messages
      const unreadRes = await query(
        'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
        [user.id]
      );
      const unreadMessages = parseInt(unreadRes.rows[0]?.count || '0');

      // 4. Completed exercises by all their students today
      const todayTotalCompletionsRes = await query(
        `SELECT COUNT(*) as count FROM completed_exercises ce
         JOIN personal_students ps ON ps.student_id = ce.student_id
         WHERE ps.personal_id = $1 AND ce.completed_at::date = CURRENT_DATE`,
        [user.id]
      );
      const studentCompletionsToday = parseInt(todayTotalCompletionsRes.rows[0]?.count || '0');

      return NextResponse.json({
        role: 'personal',
        totalStudents,
        pendingDiets,
        unreadMessages,
        studentCompletionsToday
      });
    }
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    return NextResponse.json({ error: 'Erro ao carregar dados do painel.' }, { status: 500 });
  }
}
