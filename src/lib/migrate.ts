import { query } from './db';
import bcrypt from 'bcryptjs';

export async function runMigration() {
  console.log('Starting database migrations...');
  try {
    // 1. Create Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(10) CHECK (role IN ('personal', 'student')) NOT NULL,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create Personal Students mapping
    await query(`
      CREATE TABLE IF NOT EXISTS personal_students (
        personal_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (personal_id, student_id)
      );
    `);

    // 3. Create Workouts Table
    await query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Exercises Table
    await query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        sets INTEGER NOT NULL,
        reps VARCHAR(50) NOT NULL,
        weight VARCHAR(50),
        notes TEXT
      );
    `);

    // 5. Create Completed Exercises Table
    await query(`
      CREATE TABLE IF NOT EXISTS completed_exercises (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create Diets Table
    await query(`
      CREATE TABLE IF NOT EXISTS diets (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        meal_time VARCHAR(50) NOT NULL,
        meal_name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        diet_requested BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Create Measurements Table
    await query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        type VARCHAR(10) CHECK (type IN ('current', 'target')) NOT NULL,
        weight NUMERIC(5,2),
        height NUMERIC(3,2),
        body_fat NUMERIC(4,2),
        muscle_mass NUMERIC(5,2),
        chest NUMERIC(5,2),
        waist NUMERIC(5,2),
        hips NUMERIC(5,2),
        arms NUMERIC(5,2),
        legs NUMERIC(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create Messages Table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        request_type VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables verified/created successfully.');

    // Seed Personal Trainers
    const trainers = [
      { phone: '41991455646', name: 'Personal Rodrigo' },
      { phone: '41984842941', name: 'Personal Amanda' }
    ];

    const hash = bcrypt.hashSync('123456', 10);

    for (const trainer of trainers) {
      const res = await query('SELECT * FROM users WHERE phone = $1', [trainer.phone]);
      if (res.rowCount === 0) {
        await query(
          'INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4)',
          [trainer.phone, hash, trainer.name, 'personal']
        );
        console.log(`Seeded personal trainer: ${trainer.name}`);
      }
    }

    console.log('Migrations and seeding complete.');
  } catch (err) {
    console.error('Error running migrations:', err);
    throw err;
  }
}
