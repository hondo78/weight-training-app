-- Weight Training App Database Schema

-- Exercises table - stores all available exercises
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    muscle_group VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout plans table - stores workout templates
CREATE TABLE workout_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plan exercises - links exercises to workout plans
CREATE TABLE plan_exercises (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    target_sets INTEGER DEFAULT 3,
    target_reps VARCHAR(20) DEFAULT '8-12',
    rest_seconds INTEGER DEFAULT 90,
    order_index INTEGER DEFAULT 0
);

-- Workout sessions - actual training sessions
CREATE TABLE workout_sessions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES workout_plans(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    duration_minutes INTEGER,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Exercise logs - individual exercise performance
CREATE TABLE exercise_logs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight_kg DECIMAL(6,2),
    reps INTEGER,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Body measurements tracking
CREATE TABLE body_measurements (
    id SERIAL PRIMARY KEY,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5,2),
    body_fat_percent DECIMAL(4,1),
    chest_cm DECIMAL(5,1),
    waist_cm DECIMAL(5,1),
    hips_cm DECIMAL(5,1),
    biceps_cm DECIMAL(5,1),
    thighs_cm DECIMAL(5,1),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default exercises
INSERT INTO exercises (name, muscle_group, description) VALUES
-- Chest
('Bankdrücken', 'Brust', 'Klassische Brustübung mit der Langhantel'),
('Schrägbankdrücken', 'Brust', 'Obere Brust mit Schrägbank'),
('Kurzhantel Fliegende', 'Brust', 'Isolationsübung für die Brust'),
('Dips', 'Brust', 'Körpergewichtsübung für Brust und Trizeps'),
('Cable Crossover', 'Brust', 'Kabelzug für Brustdefinition'),

-- Back
('Kreuzheben', 'Rücken', 'Grundübung für den gesamten Rücken'),
('Klimmzüge', 'Rücken', 'Körpergewichtsübung für den Latissimus'),
('Langhantelrudern', 'Rücken', 'Ruderübung für die Rückenbreite'),
('Latzug', 'Rücken', 'Kabelzugübung für den Lat'),
('Kurzhantelrudern', 'Rücken', 'Einarmiges Rudern'),
('Face Pulls', 'Rücken', 'Für hintere Schulter und oberen Rücken'),

-- Legs
('Kniebeugen', 'Beine', 'Königsübung für die Beine'),
('Beinpresse', 'Beine', 'Maschine für Quadrizeps'),
('Rumänisches Kreuzheben', 'Beine', 'Für Hamstrings und Gesäß'),
('Ausfallschritte', 'Beine', 'Unilaterale Beinübung'),
('Beinstrecker', 'Beine', 'Isolation für Quadrizeps'),
('Beinbeuger', 'Beine', 'Isolation für Hamstrings'),
('Wadenheben', 'Beine', 'Für die Wadenmuskulatur'),

-- Shoulders
('Schulterdrücken', 'Schultern', 'Grundübung für die Schultern'),
('Seitheben', 'Schultern', 'Für die seitliche Schulter'),
('Frontheben', 'Schultern', 'Für die vordere Schulter'),
('Reverse Flys', 'Schultern', 'Für die hintere Schulter'),
('Arnold Press', 'Schultern', 'Variante des Schulterdrückens'),

-- Arms
('Langhantel Curls', 'Arme', 'Bizeps Grundübung'),
('Hammer Curls', 'Arme', 'Für Bizeps und Unterarm'),
('Trizepsdrücken', 'Arme', 'Am Kabelzug'),
('French Press', 'Arme', 'Trizeps Überkopf'),
('Dips (eng)', 'Arme', 'Für den Trizeps'),

-- Core
('Plank', 'Core', 'Statische Rumpfstabilisation'),
('Crunches', 'Core', 'Klassische Bauchübung'),
('Beinheben', 'Core', 'Für den unteren Bauch'),
('Russian Twists', 'Core', 'Für die seitlichen Bauchmuskeln'),
('Ab Wheel Rollout', 'Core', 'Fortgeschrittene Core-Übung');

-- Create some example workout plans
INSERT INTO workout_plans (name, description) VALUES
('Push Day', 'Brust, Schultern und Trizeps'),
('Pull Day', 'Rücken und Bizeps'),
('Leg Day', 'Komplettes Beintraining'),
('Oberkörper', 'Kompletter Oberkörper'),
('Unterkörper', 'Beine und Core');

-- Link exercises to Push Day (plan_id = 1)
INSERT INTO plan_exercises (plan_id, exercise_id, target_sets, target_reps, rest_seconds, order_index) VALUES
(1, 1, 4, '6-8', 120, 1),   -- Bankdrücken
(1, 2, 3, '8-10', 90, 2),   -- Schrägbankdrücken
(1, 18, 4, '8-10', 90, 3),  -- Schulterdrücken
(1, 19, 3, '12-15', 60, 4), -- Seitheben
(1, 24, 3, '10-12', 60, 5); -- Trizepsdrücken

-- Link exercises to Pull Day (plan_id = 2)
INSERT INTO plan_exercises (plan_id, exercise_id, target_sets, target_reps, rest_seconds, order_index) VALUES
(2, 6, 4, '5', 180, 1),     -- Kreuzheben
(2, 7, 4, '6-10', 120, 2),  -- Klimmzüge
(2, 8, 4, '8-10', 90, 3),   -- Langhantelrudern
(2, 11, 3, '15-20', 60, 4), -- Face Pulls
(2, 22, 3, '10-12', 60, 5); -- Langhantel Curls

-- Link exercises to Leg Day (plan_id = 3)
INSERT INTO plan_exercises (plan_id, exercise_id, target_sets, target_reps, rest_seconds, order_index) VALUES
(3, 12, 4, '6-8', 180, 1),  -- Kniebeugen
(3, 14, 4, '8-10', 120, 2), -- Rumänisches Kreuzheben
(3, 13, 3, '10-12', 90, 3), -- Beinpresse
(3, 15, 3, '10-12', 60, 4), -- Ausfallschritte
(3, 18, 4, '12-15', 60, 5); -- Wadenheben

-- Create indexes for better query performance
CREATE INDEX idx_exercise_logs_session ON exercise_logs(session_id);
CREATE INDEX idx_exercise_logs_exercise ON exercise_logs(exercise_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(session_date);
CREATE INDEX idx_body_measurements_date ON body_measurements(measurement_date);
CREATE INDEX idx_plan_exercises_plan ON plan_exercises(plan_id);
