const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trainer:strongpassword123@localhost:5432/weight_training'
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ============ EXERCISES ============

// Get all exercises
app.get('/api/exercises', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exercises ORDER BY muscle_group, name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exercises by muscle group
app.get('/api/exercises/muscle/:group', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE muscle_group = $1 ORDER BY name',
      [req.params.group]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new exercise
app.post('/api/exercises', async (req, res) => {
  const { name, muscle_group, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO exercises (name, muscle_group, description) VALUES ($1, $2, $3) RETURNING *',
      [name, muscle_group, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ WORKOUT PLANS ============

// Get all workout plans
app.get('/api/plans', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workout_plans ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single plan with exercises
app.get('/api/plans/:id', async (req, res) => {
  try {
    const planResult = await pool.query(
      'SELECT * FROM workout_plans WHERE id = $1',
      [req.params.id]
    );
    
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const exercisesResult = await pool.query(`
      SELECT pe.*, e.name, e.muscle_group, e.description
      FROM plan_exercises pe
      JOIN exercises e ON pe.exercise_id = e.id
      WHERE pe.plan_id = $1
      ORDER BY pe.order_index
    `, [req.params.id]);

    res.json({
      ...planResult.rows[0],
      exercises: exercisesResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new workout plan
app.post('/api/plans', async (req, res) => {
  const { name, description, exercises } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const planResult = await client.query(
      'INSERT INTO workout_plans (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    
    const planId = planResult.rows[0].id;
    
    if (exercises && exercises.length > 0) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await client.query(
          `INSERT INTO plan_exercises (plan_id, exercise_id, target_sets, target_reps, rest_seconds, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [planId, ex.exercise_id, ex.target_sets || 3, ex.target_reps || '8-12', ex.rest_seconds || 90, i + 1]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(planResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update workout plan
app.put('/api/plans/:id', async (req, res) => {
  const { name, description, exercises } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE workout_plans SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, description, req.params.id]
    );
    
    // Delete existing exercises and re-add
    await client.query('DELETE FROM plan_exercises WHERE plan_id = $1', [req.params.id]);
    
    if (exercises && exercises.length > 0) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await client.query(
          `INSERT INTO plan_exercises (plan_id, exercise_id, target_sets, target_reps, rest_seconds, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.params.id, ex.exercise_id, ex.target_sets || 3, ex.target_reps || '8-12', ex.rest_seconds || 90, i + 1]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Plan updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Delete workout plan
app.delete('/api/plans/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workout_plans WHERE id = $1', [req.params.id]);
    res.json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ WORKOUT SESSIONS ============

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ws.*, wp.name as plan_name
      FROM workout_sessions ws
      LEFT JOIN workout_plans wp ON ws.plan_id = wp.id
      ORDER BY ws.session_date DESC, ws.started_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single session with logs
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const sessionResult = await pool.query(`
      SELECT ws.*, wp.name as plan_name
      FROM workout_sessions ws
      LEFT JOIN workout_plans wp ON ws.plan_id = wp.id
      WHERE ws.id = $1
    `, [req.params.id]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const logsResult = await pool.query(`
      SELECT el.*, e.name as exercise_name, e.muscle_group
      FROM exercise_logs el
      JOIN exercises e ON el.exercise_id = e.id
      WHERE el.session_id = $1
      ORDER BY el.logged_at, el.set_number
    `, [req.params.id]);

    res.json({
      ...sessionResult.rows[0],
      logs: logsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start new session
app.post('/api/sessions', async (req, res) => {
  const { plan_id, session_date, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO workout_sessions (plan_id, session_date, notes)
       VALUES ($1, $2, $3) RETURNING *`,
      [plan_id || null, session_date || new Date().toISOString().split('T')[0], notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete session
app.put('/api/sessions/:id/complete', async (req, res) => {
  const { duration_minutes, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE workout_sessions 
       SET completed_at = CURRENT_TIMESTAMP, duration_minutes = $1, notes = COALESCE($2, notes)
       WHERE id = $3 RETURNING *`,
      [duration_minutes, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workout_sessions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXERCISE LOGS ============

// Add exercise log
app.post('/api/logs', async (req, res) => {
  const { session_id, exercise_id, set_number, weight_kg, reps, rpe, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO exercise_logs (session_id, exercise_id, set_number, weight_kg, reps, rpe, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [session_id, exercise_id, set_number, weight_kg, reps, rpe, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exercise log
app.put('/api/logs/:id', async (req, res) => {
  const { weight_kg, reps, rpe, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE exercise_logs 
       SET weight_kg = $1, reps = $2, rpe = $3, notes = $4
       WHERE id = $5 RETURNING *`,
      [weight_kg, reps, rpe, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete exercise log
app.delete('/api/logs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM exercise_logs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Log deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exercise history (for progress tracking)
app.get('/api/exercises/:id/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT el.*, ws.session_date
      FROM exercise_logs el
      JOIN workout_sessions ws ON el.session_id = ws.id
      WHERE el.exercise_id = $1
      ORDER BY ws.session_date DESC, el.set_number
      LIMIT 100
    `, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get personal records for an exercise
app.get('/api/exercises/:id/records', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        MAX(weight_kg) as max_weight,
        MAX(reps) FILTER (WHERE weight_kg = (SELECT MAX(weight_kg) FROM exercise_logs WHERE exercise_id = $1)) as reps_at_max,
        MAX(weight_kg * reps) as max_volume_set
      FROM exercise_logs
      WHERE exercise_id = $1
    `, [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ BODY MEASUREMENTS ============

// Get all measurements
app.get('/api/measurements', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM body_measurements ORDER BY measurement_date DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add measurement
app.post('/api/measurements', async (req, res) => {
  const { measurement_date, weight_kg, body_fat_percent, chest_cm, waist_cm, hips_cm, biceps_cm, thighs_cm, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO body_measurements 
       (measurement_date, weight_kg, body_fat_percent, chest_cm, waist_cm, hips_cm, biceps_cm, thighs_cm, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [measurement_date || new Date().toISOString().split('T')[0], weight_kg, body_fat_percent, chest_cm, waist_cm, hips_cm, biceps_cm, thighs_cm, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete measurement
app.delete('/api/measurements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM body_measurements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Measurement deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATISTICS ============

// Get dashboard stats
app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const [sessionsThisWeek, totalSessions, totalVolume, recentPRs] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as count
        FROM workout_sessions
        WHERE session_date >= CURRENT_DATE - INTERVAL '7 days'
      `),
      pool.query('SELECT COUNT(*) as count FROM workout_sessions'),
      pool.query(`
        SELECT COALESCE(SUM(weight_kg * reps), 0) as total
        FROM exercise_logs el
        JOIN workout_sessions ws ON el.session_id = ws.id
        WHERE ws.session_date >= CURRENT_DATE - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT e.name, el.weight_kg, el.reps, ws.session_date
        FROM exercise_logs el
        JOIN exercises e ON el.exercise_id = e.id
        JOIN workout_sessions ws ON el.session_id = ws.id
        WHERE ws.session_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY el.weight_kg DESC
        LIMIT 5
      `)
    ]);

    res.json({
      sessions_this_week: parseInt(sessionsThisWeek.rows[0].count),
      total_sessions: parseInt(totalSessions.rows[0].count),
      monthly_volume_kg: parseFloat(totalVolume.rows[0].total) || 0,
      recent_top_lifts: recentPRs.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get muscle group distribution
app.get('/api/stats/muscle-distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.muscle_group, COUNT(el.id) as set_count, SUM(el.weight_kg * el.reps) as volume
      FROM exercise_logs el
      JOIN exercises e ON el.exercise_id = e.id
      JOIN workout_sessions ws ON el.session_id = ws.id
      WHERE ws.session_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY e.muscle_group
      ORDER BY volume DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Weight Training API running on port ${PORT}`);
});
