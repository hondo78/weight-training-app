-- Weight Training App Database Schema

-- Exercises table - stores all available exercises
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    muscle_group VARCHAR(50) NOT NULL,
    description TEXT,
    instructions TEXT,
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

-- Ausführungsbeschreibungen der Standardübungen (in der App editierbar)
UPDATE exercises AS e SET instructions = v.text FROM (VALUES
('Bankdrücken', $$Ausgangsposition: Rücklings auf die Flachbank, Augen unter der Stange. Füße flach am Boden, Schulterblätter zusammen und nach unten ziehen. Griff etwas breiter als schulterbreit.
Ausführung: Stange kontrolliert zur unteren Brust (Höhe Brustbein) senken, Ellbogen ca. 45–70° vom Körper. Kurz berühren, dann kraftvoll nach oben drücken, bis die Arme fast gestreckt sind.
Achte auf: Handgelenke gerade über den Ellbogen, Gesäß bleibt auf der Bank. Bei schweren Sätzen mit Sicherungsablagen oder Partner trainieren.
Rücken: Nur ein leichtes natürliches Hohlkreuz – kein starkes Brücken-Hohlkreuz. Bei Beschwerden die Füße auf die Bank stellen.$$),
('Schrägbankdrücken', $$Ausgangsposition: Bank auf 30–45° einstellen. Schulterblätter zurück und unten, Füße fest am Boden.
Ausführung: Stange oder Kurzhanteln zur oberen Brust (knapp unter dem Schlüsselbein) senken und senkrecht nach oben drücken.
Achte auf: Nicht steiler als 45°, sonst übernehmen die Schultern. Ellbogen nicht ganz seitlich abspreizen.
Rücken: Rücken liegt flächig an der Lehne, kein Hohlkreuz zum „Mitdrücken“.$$),
('Kurzhantel Fliegende', $$Ausgangsposition: Rücklings auf der Flachbank, Kurzhanteln über der Brust, Handflächen zueinander, Ellbogen leicht gebeugt.
Ausführung: Arme in einem weiten Bogen seitlich absenken, bis ein Dehnungsgefühl in der Brust entsteht (Oberarme etwa auf Bankhöhe). Im gleichen Bogen zurückführen, als würdest du einen Baum umarmen.
Achte auf: Der Ellbogenwinkel bleibt die ganze Zeit gleich. Leichte Gewichte – das ist eine Dehn- und Isolationsübung.$$),
('Dips', $$Ausgangsposition: Am Barren in den Stütz, Arme gestreckt, Oberkörper leicht nach vorne geneigt (Brustfokus).
Ausführung: Kontrolliert absenken, bis die Oberarme etwa parallel zum Boden sind. Wieder hochdrücken.
Achte auf: Nicht tiefer gehen, wenn die Schultern zwicken. Schultern weg von den Ohren halten.
Hinweis: Belastet die Schultern stark – bei Schulterproblemen besser Cable Crossover oder Bankdrücken.$$),
('Cable Crossover', $$Ausgangsposition: Mittig zwischen zwei Kabelzügen, Griffe auf Schulterhöhe oder höher. Ein Schritt nach vorne, leichte Schrittstellung, Oberkörper minimal vorgeneigt.
Ausführung: Arme mit leicht gebeugten Ellbogen im Bogen nach vorne-unten zusammenführen, bis sich die Hände vor dem Körper treffen. Kurz halten, langsam zurück.
Achte auf: Bewegung kommt aus den Schultern, nicht aus den Ellbogen.
Rücken: Bauch leicht anspannen, nicht ins Hohlkreuz fallen; die Schrittstellung stabilisiert.$$),
('Kreuzheben', $$Ausgangsposition: Füße hüftbreit, Stange über der Fußmitte. Hüfte nach hinten, Stange schulterbreit greifen, Rücken gerade, Brust raus.
Ausführung: Bauch fest anspannen, Stange nah am Körper vom Boden ziehen, indem du Beine und Hüfte gleichzeitig streckst. Oben aufrecht stehen, dann kontrolliert auf dem gleichen Weg ablegen.
Achte auf: Rücken bleibt die ganze Zeit neutral, kein Rundrücken.
Rücken: Hohe Last auf der Lendenwirbelsäule – bei Problemen mit den unteren Wirbeln nicht durchführen. Alternativen: Latzug, Beinbeuger, Kurzhantelrudern auf der Bank.$$),
('Klimmzüge', $$Ausgangsposition: Stange etwas breiter als schulterbreit im Obergriff fassen, frei hängen, Schultern aktiv nach unten ziehen.
Ausführung: Brust zur Stange ziehen, bis das Kinn über der Stange ist. Langsam bis fast zur vollen Streckung absenken.
Achte auf: Kein Schwung, kein Kipping, Beine ruhig. Wenn noch zu schwer: Band-Unterstützung oder Latzug.
Rücken: Das Hängen entlastet die Wirbelsäule. Kein Hohlkreuz – Bauch und Gesäß leicht anspannen.$$),
('Langhantelrudern', $$Ausgangsposition: Stehend, Knie leicht gebeugt, Oberkörper aus der Hüfte ca. 45° nach vorne geneigt, Rücken gerade, Stange schulterbreit.
Ausführung: Stange zum Bauchnabel ziehen, Schulterblätter zusammen, langsam ablassen.
Rücken: Die vorgebeugte Haltung belastet die Lendenwirbelsäule dauerhaft. Bei Rückenproblemen besser Kurzhantelrudern auf der Bank oder Rudern am Kabel/sitzend.$$),
('Latzug', $$Ausgangsposition: Aufrecht an der Maschine sitzen, Oberschenkel unter dem Polster fixiert. Stange etwas breiter als schulterbreit greifen.
Ausführung: Brust leicht heraus, Stange zur oberen Brust ziehen, dabei die Ellbogen nach unten und hinten führen. Schulterblätter zusammen, langsam nach oben zurück.
Achte auf: Nicht hinter den Nacken ziehen. Nicht mit dem Oberkörper nach hinten werfen – max. leicht zurücklehnen.
Rücken: Oberkörper ruhig halten, kein Schwung aus dem unteren Rücken.$$),
('Kurzhantelrudern', $$Ausgangsposition: Ein Knie und die gleichseitige Hand auf der Flachbank abstützen, anderer Fuß fest am Boden. Rücken gerade und parallel zum Boden.
Ausführung: Kurzhantel mit gestrecktem Arm hängen lassen, dann zur Hüfte ziehen (Ellbogen nah am Körper, nach hinten-oben). Oben kurz halten, langsam ablassen. Dann Seite wechseln.
Achte auf: Kein Aufdrehen des Oberkörpers, die Schultern bleiben parallel zur Bank.
Rücken: Durch die Abstützung trägt die Lendenwirbelsäule kaum Last – rückenschonende Alternative zum Langhantelrudern.$$),
('Face Pulls', $$Ausgangsposition: Kabelzug auf Kopfhöhe mit Seilgriff. Seil mit beiden Händen, Daumen zeigen nach hinten, ein Schritt zurück.
Ausführung: Seil zum Gesicht ziehen und dabei die Hände auseinander ziehen, Ellbogen hoch und nach außen. Am Ende die Arme leicht nach außen rotieren („Doppelbizeps-Pose“). Langsam zurück.
Achte auf: Leichtes Gewicht, saubere Bewegung, Schulterblätter zusammen.
Rücken: Aufrecht stehen, nicht nach hinten lehnen.$$),
('Kniebeugen', $$Ausgangsposition: Langhantel auf dem oberen Trapezmuskel, Füße schulterbreit, Fußspitzen leicht nach außen.
Ausführung: Hüfte nach hinten und Knie nach außen beugen, bis die Oberschenkel mindestens parallel zum Boden sind. Aus den Fersen kraftvoll nach oben drücken.
Achte auf: Knie folgen der Richtung der Fußspitzen, Fersen bleiben am Boden, Brust bleibt oben.
Rücken: Die Langhantel drückt direkt auf die Wirbelsäule – bei Problemen mit den unteren Wirbeln nicht durchführen. Alternative: Beinpresse, ggf. Goblet Squat mit leichter Kurzhantel.$$),
('Beinpresse', $$Ausgangsposition: Rücken und Gesäß fest an der Lehne. Füße schulterbreit mittig auf der Plattform, Fußspitzen leicht nach außen.
Ausführung: Sicherung lösen, Plattform kontrolliert absenken, bis die Knie etwa 90° gebeugt sind. Über die ganze Fußsohle zurückdrücken, Knie oben nicht ganz durchstrecken.
Achte auf: Knie zeigen in Richtung der Fußspitzen, nicht nach innen.
Rücken: Nur so tief gehen, dass Becken und unterer Rücken an der Lehne bleiben. Wenn sich das Becken unten einrollt, ist die Bewegung zu tief – das belastet die unteren Bandscheiben.$$),
('Rumänisches Kreuzheben', $$Ausgangsposition: Aufrecht mit der Stange vor den Oberschenkeln, Füße hüftbreit, Knie leicht gebeugt.
Ausführung: Hüfte nach hinten schieben und den Oberkörper mit geradem Rücken nach vorne neigen, Stange gleitet an den Beinen entlang bis etwa unter die Knie. Mit Gesäßspannung zurück in den Stand.
Achte auf: Die Knie bleiben fast gestreckt, die Bewegung kommt aus der Hüfte.
Rücken: Hohe Hebelbelastung der Lendenwirbelsäule – bei Rückenproblemen nicht durchführen. Alternative: Beinbeuger.$$),
('Ausfallschritte', $$Ausgangsposition: Aufrecht stehend, Kurzhanteln locker neben dem Körper (oder ohne Gewicht).
Ausführung: Einen großen Schritt nach vorne machen und das hintere Knie Richtung Boden senken, bis beide Knie ca. 90° gebeugt sind. Über die vordere Ferse zurückdrücken. Seiten abwechseln.
Achte auf: Vorderes Knie bleibt über dem Fuß und kippt nicht nach innen. Oberkörper aufrecht.
Rücken: Keine Langhantel auf dem Rücken – leichte Kurzhanteln reichen. Bauch anspannen, kein Hohlkreuz.$$),
('Beinstrecker', $$Ausgangsposition: An der Maschine sitzen, Rücken an der Lehne, Knie auf Höhe des Drehpunkts. Polster knapp über den Sprunggelenken.
Ausführung: Beine bis fast zur vollen Streckung anheben, oben kurz die Oberschenkel anspannen, langsam absenken.
Achte auf: Langsames Ablassen, kein Schwung. An den Griffen festhalten, Gesäß bleibt auf dem Sitz.$$),
('Beinbeuger', $$Ausgangsposition: Sitzend oder liegend an der Maschine, Knie auf Höhe des Drehpunkts, Polster knapp über den Fersen.
Ausführung: Fersen Richtung Gesäß ziehen, kurz halten, langsam zurück bis fast zur Streckung.
Achte auf: Hüfte bleibt am Polster bzw. Sitz, nicht hochheben.
Rücken: Die sitzende Variante ist meist angenehmer für den unteren Rücken als die liegende. Beim liegenden Beinbeuger nicht ins Hohlkreuz drücken.$$),
('Wadenheben', $$Ausgangsposition: Fußballen auf einer Kante oder der Plattform, Fersen frei.
Ausführung: Fersen so weit wie möglich absenken (Dehnung), dann maximal auf die Zehenspitzen drücken, oben 1 Sekunde halten.
Achte auf: Langsam und mit voller Bewegungsamplitude, nicht wippen.
Rücken: Sitzend oder an der Beinpresse ausführen. Stehende Varianten mit Schulterpolster oder Langhantel belasten die Wirbelsäule.$$),
('Schulterdrücken', $$Ausgangsposition: Sitzend auf einer Bank mit senkrechter Lehne, Rücken an der Lehne. Kurzhanteln oder Stange auf Schulterhöhe.
Ausführung: Gewicht senkrecht über den Kopf drücken, bis die Arme fast gestreckt sind. Kontrolliert zurück auf Schulterhöhe.
Achte auf: Ellbogen leicht vor dem Körper, nicht ganz seitlich.
Rücken: Sitzend mit Lehne trainieren. Im Stehen neigt man zum Hohlkreuz, das belastet die Lendenwirbelsäule.$$),
('Seitheben', $$Ausgangsposition: Aufrecht stehend oder sitzend, Kurzhanteln neben dem Körper, Ellbogen leicht gebeugt.
Ausführung: Arme seitlich bis etwa Schulterhöhe heben, die Ellbogen führen. Langsam absenken.
Achte auf: Leichtes Gewicht, kein Schwung aus dem Oberkörper. Schultern nicht zu den Ohren ziehen.
Rücken: Bei Schwung-Tendenz sitzend ausführen.$$),
('Frontheben', $$Ausgangsposition: Aufrecht, Kurzhanteln vor den Oberschenkeln, Ellbogen leicht gebeugt.
Ausführung: Arme abwechselnd oder gleichzeitig nach vorne bis Schulterhöhe heben, langsam ablassen.
Achte auf: Kein Zurücklehnen, keinen Schwung holen.
Hinweis: Die vordere Schulter wird bei Drückübungen schon stark trainiert – meist entbehrlich.$$),
('Reverse Flys', $$Ausgangsposition: An der Butterfly-Maschine mit Brust zum Polster oder bäuchlings auf einer Schrägbank (30–45°), Kurzhanteln hängen nach unten.
Ausführung: Arme mit leicht gebeugten Ellbogen seitlich nach hinten-oben führen, Schulterblätter zusammen. Langsam zurück.
Achte auf: Leichtes Gewicht, Bewegung aus der Schulter, nicht aus den Ellbogen.
Rücken: Mit Brustabstützung (Maschine oder Schrägbank) statt vorgebeugt im Stehen – so wird die Lendenwirbelsäule nicht belastet.$$),
('Arnold Press', $$Ausgangsposition: Sitzend mit Rückenlehne, Kurzhanteln vor dem Gesicht, Handflächen zeigen zu dir.
Ausführung: Beim Hochdrücken die Hände nach außen drehen, sodass die Handflächen oben nach vorne zeigen. Auf dem gleichen Weg zurück.
Achte auf: Ruhige, fließende Rotation, kein Schwung.
Rücken: Sitzend mit Lehne, kein Hohlkreuz.$$),
('Langhantel Curls', $$Ausgangsposition: Aufrecht, Stange schulterbreit im Untergriff, Ellbogen am Körper.
Ausführung: Stange durch Beugen der Ellbogen zur Brust heben, oben anspannen, langsam ablassen.
Achte auf: Ellbogen bleiben an der Seite, nur die Unterarme bewegen sich.
Rücken: Nicht zurücklehnen oder Schwung holen – das führt ins Hohlkreuz. Bei Rückenproblemen Kurzhantel-Curls sitzend oder Hammer Curls.$$),
('Hammer Curls', $$Ausgangsposition: Aufrecht stehend oder sitzend, Kurzhanteln neben dem Körper, Handflächen zeigen zueinander (Neutralgriff).
Ausführung: Kurzhanteln abwechselnd oder gleichzeitig zur Schulter heben, Handgelenk bleibt neutral. Langsam ablassen.
Achte auf: Ellbogen bleiben am Körper, kein Schwung.
Rücken: Bei Schwung-Tendenz sitzend mit Lehne ausführen.$$),
('Trizepsdrücken', $$Ausgangsposition: Am Kabelzug mit Seil oder Stange, Griff auf Brusthöhe, Ellbogen fest an der Seite. Aufrecht, Knie leicht gebeugt.
Ausführung: Unterarme nach unten strecken, bis die Arme gestreckt sind, unten kurz anspannen. Langsam zurück bis die Unterarme etwa waagrecht sind.
Achte auf: Nur die Unterarme bewegen sich, die Ellbogen bleiben an Ort und Stelle.
Rücken: Aufrecht bleiben, nicht mit dem Oberkörper über das Gewicht lehnen.$$),
('French Press', $$Ausgangsposition: Rücklings auf der Flachbank, SZ-Stange oder Kurzhanteln mit gestreckten Armen über der Brust.
Ausführung: Nur die Ellbogen beugen und das Gewicht kontrolliert zur Stirn bzw. knapp hinter den Kopf senken. Zurück in die Streckung.
Achte auf: Oberarme bleiben ruhig und zeigen leicht nach hinten, Ellbogen nicht nach außen fallen lassen.
Rücken: Liegend ist schonender als die Überkopf-Variante im Stehen.$$),
('Dips (eng)', $$Ausgangsposition: Am Barren oder hinter einer Bank, Oberkörper aufrecht, Ellbogen nah am Körper.
Ausführung: Senken, bis die Oberarme etwa parallel zum Boden sind, wieder hochdrücken.
Achte auf: Oberkörper aufrecht (Trizeps-Fokus), Schultern tief halten.
Hinweis: Belastet die Schultern stark – bei Beschwerden lieber Trizepsdrücken am Kabel.$$),
('Plank', $$Ausgangsposition: Unterarmstütz, Ellbogen unter den Schultern, Beine gestreckt, auf den Zehenspitzen.
Ausführung: Körper bildet eine gerade Linie von Kopf bis Ferse. Bauch und Gesäß anspannen und halten (Wdh = Sekunden).
Achte auf: Hüfte weder durchhängen lassen noch hochschieben, ruhig weiteratmen.
Rücken: Gute rückenschonende Rumpfübung. Wenn die Hüfte absackt, sofort abbrechen – dann landet die Last im unteren Rücken.$$),
('Crunches', $$Ausgangsposition: Rückenlage, Knie gebeugt, Füße am Boden, Hände an den Schläfen.
Ausführung: Oberkörper nur so weit einrollen, bis die Schulterblätter vom Boden abheben, kurz halten, langsam ablegen.
Achte auf: Nicht am Kopf ziehen, Kinn etwas Abstand zur Brust.
Rücken: Wiederholtes Beugen der Wirbelsäule ist bei Bandscheibenproblemen ungünstig. Rückenschonender: Plank, Bird Dog.$$),
('Beinheben', $$Ausgangsposition: Hängend an der Stange oder in Rückenlage, Beine gestreckt oder leicht gebeugt.
Ausführung: Beine kontrolliert anheben, bis die Oberschenkel etwa waagrecht sind, langsam ablassen.
Achte auf: Kein Schwung, Becken leicht einrollen.
Rücken: Der Hüftbeuger zieht dabei an der Lendenwirbelsäule – bei Problemen mit den unteren Wirbeln vermeiden. Alternative: Bird Dog, Plank.$$),
('Russian Twists', $$Ausgangsposition: Sitzend, Knie gebeugt, Oberkörper leicht zurückgelehnt, Rücken gerade.
Ausführung: Oberkörper abwechselnd nach links und rechts drehen, Hände bzw. Gewicht neben die Hüfte führen.
Achte auf: Drehung aus dem Brustkorb, nicht nur die Arme bewegen.
Rücken: Drehung unter Beugung belastet die Bandscheiben – bei Problemen im unteren Rücken vermeiden.$$),
('Ab Wheel Rollout', $$Ausgangsposition: Kniend, Hände am Rad unter den Schultern.
Ausführung: Rad langsam nach vorne rollen, bis der Körper fast gestreckt ist, dann mit Bauchspannung zurückziehen.
Achte auf: Nur so weit rollen, wie du die Spannung halten kannst.
Rücken: Sackt die Hüfte durch, entsteht ein starkes Hohlkreuz – bei Rückenproblemen nicht durchführen.$$),
('Bird Dog', $$Ausgangsposition: Vierfüßlerstand, Hände unter den Schultern, Knie unter der Hüfte, Rücken neutral (gerade wie ein Tisch).
Ausführung: Gleichzeitig den rechten Arm nach vorne und das linke Bein nach hinten strecken, bis beide waagrecht sind. 2–3 Sekunden halten, zurück, dann Seite wechseln. Wdh = pro Seite.
Achte auf: Becken bleibt waagrecht und dreht nicht auf, der Rücken bleibt flach – nicht ins Hohlkreuz gehen. Langsam und kontrolliert.
Rücken: Eine der rückenfreundlichsten Rumpfübungen (Teil der „Big 3“ nach McGill).$$)
) AS v(name, text)
WHERE e.name = v.name;
