# 🏋️ IRON LOG - Gewichtstraining Tracker

Eine moderne Webapplikation zum Planen und Dokumentieren deines Gewichtstrainings.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Tech Stack](https://img.shields.io/badge/Node.js-20-green) ![Tech Stack](https://img.shields.io/badge/PostgreSQL-16-blue) ![Tech Stack](https://img.shields.io/badge/Docker-Compose-blue)

## Features

- **📊 Dashboard** - Übersicht über deine Trainingsaktivitäten und Fortschritte
- **💪 Training** - Starte und dokumentiere Workout-Sessions in Echtzeit
- **📋 Trainingspläne** - Erstelle und verwalte wiederverwendbare Trainingspläne
- **🏃 Übungskatalog** - Vordefinierte Übungen für alle Muskelgruppen + eigene hinzufügen
- **📈 Fortschritt** - Verfolge deine Entwicklung bei jeder Übung mit Diagrammen
- **⚖️ Körperdaten** - Tracke Gewicht, Körperfett und Umfänge

## Schnellstart

### Voraussetzungen

- Docker und Docker Compose installiert

### Installation & Start

```bash
# Repository klonen oder Dateien kopieren
cd weight-training-app

# Container starten
docker compose up -d

# App ist nun erreichbar unter:
# Frontend: http://<host>:3002
# API:      http://localhost:3011   (nur vom Host aus)
# pgAdmin:  http://localhost:5052   (nur vom Host aus, ohne Login)
```

### Stoppen

```bash
docker compose down

# Mit Datenbank-Reset:
docker compose down -v
```

## Architektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Nginx       │     │   Express.js    │     │   PostgreSQL    │
│   (Frontend)    │────▶│    (Backend)    │────▶│   (Database)    │
│ Host-Port: 3002 │     │ Host-Port: 3011 │     │ kein Host-Port  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Technologie-Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts, React Router
- **Backend**: Node.js, Express.js
- **Datenbank**: PostgreSQL 16
- **Container**: Docker, Docker Compose

## Projektstruktur

```
weight-training-app/
├── docker-compose.yml      # Container-Orchestrierung
├── init.sql                # Datenbank-Schema & Seed-Daten
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js           # Express API Server
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        └── pages/
            ├── Dashboard.jsx
            ├── Workout.jsx
            ├── Plans.jsx
            ├── Exercises.jsx
            ├── Progress.jsx
            └── Measurements.jsx
```

## API Endpunkte

### Übungen
- `GET /api/exercises` - Alle Übungen
- `POST /api/exercises` - Neue Übung erstellen
- `GET /api/exercises/:id/history` - Übungshistorie
- `GET /api/exercises/:id/records` - Persönliche Rekorde

### Trainingspläne
- `GET /api/plans` - Alle Pläne
- `GET /api/plans/:id` - Plan mit Übungen
- `POST /api/plans` - Neuen Plan erstellen
- `PUT /api/plans/:id` - Plan bearbeiten
- `DELETE /api/plans/:id` - Plan löschen

### Workout Sessions
- `GET /api/sessions` - Alle Sessions
- `GET /api/sessions/:id` - Session mit Logs
- `POST /api/sessions` - Neue Session starten
- `PUT /api/sessions/:id/complete` - Session abschließen

### Übungslogs
- `POST /api/logs` - Satz dokumentieren
- `PUT /api/logs/:id` - Satz aktualisieren
- `DELETE /api/logs/:id` - Satz löschen

### Körpermessungen
- `GET /api/measurements` - Alle Messungen
- `POST /api/measurements` - Neue Messung
- `DELETE /api/measurements/:id` - Messung löschen

### Statistiken
- `GET /api/stats/dashboard` - Dashboard-Statistiken
- `GET /api/stats/muscle-distribution` - Muskelgruppen-Verteilung

## Datenbank-Schema

Die Datenbank enthält folgende Tabellen:

- `exercises` - Übungskatalog
- `workout_plans` - Trainingspläne
- `plan_exercises` - Verknüpfung Plan ↔ Übungen
- `workout_sessions` - Trainingseinheiten
- `exercise_logs` - Einzelne Sätze
- `body_measurements` - Körpermessungen

## Entwicklung

### Lokale Entwicklung

Die Datenbank hat absichtlich keinen Host-Port. Am einfachsten läuft das
Frontend lokal gegen das Docker-Backend:

```bash
docker compose up -d db backend
cd frontend
npm install
npm run dev          # Vite leitet /api an http://localhost:3011 weiter
```

Ein lokal gestartetes Backend braucht eine erreichbare Datenbank
(`DATABASE_URL`) und einen freien Port (`PORT`, Standard 3001). Das Frontend
zeigt dann per `API_TARGET` darauf:

```bash
cd backend && PORT=3012 DATABASE_URL=postgresql://... npm run dev
cd frontend && API_TARGET=http://localhost:3012 npm run dev
```

### Datenbank-Zugang

```bash
# Verbindung zur Datenbank
docker exec -it weight_training_db psql -U trainer -d weight_training
```

## Anpassungen

### Passwort ändern

In `docker-compose.yml` und `backend/server.js` das Passwort `strongpassword123` anpassen.

### Port ändern

In `docker-compose.yml` die Ports unter `ports:` anpassen. Der Vite-Dev-Proxy
nutzt `API_TARGET` (Standard `http://localhost:3011`), das Backend `PORT`.

## Lizenz

MIT License
