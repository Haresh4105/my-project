# GramCare — AI-Assisted Rural Healthcare & Early Risk Screening

A full-stack demonstration application based on the provided rural-healthcare problem statement. It supports patient registration, basic health screening, vital tracking, local facility discovery, and preventive-health education.

## Important medical and privacy limitations
- This is a **demonstration and preliminary screening aid**, not a clinically validated diagnostic system. It does not diagnose diseases or replace a qualified healthcare professional.
- The risk engine currently uses transparent, illustrative rules (age, reported symptoms, and entered vitals). It is **not a trained AI/ML model**. The UI labels results as preliminary risk guidance.
- Seeded facility records are examples, not a verified live directory. Confirm address, hours, and services with facilities before travelling.
- Do not enter real patient information in a public demo. Before real-world use, add authenticated roles, consent management, encryption, audit logs, backups, a security review, clinical validation, and applicable legal/regulatory review.

## Features
- Responsive dashboard with key counts and recent activity
- Patient registration and searchable patient list
- Structured screening form and explainable risk flags
- Vital observations with timestamped history
- Nearby facility directory with search and service filters
- Preventive health education cards
- Express REST API, validation, SQLite persistence, and API error handling
- Automated API tests for health endpoint and risk assessment

## Stack
- Frontend: React, TypeScript, Vite, CSS
- Backend: Node.js, Express, TypeScript
- Database: SQLite via `better-sqlite3`
- Validation: Zod
- Tests: Node test runner + Supertest

## Requirements
- Node.js 20 or later
- npm 10 or later

## Run locally
```bash
npm install
cp server/.env.example server/.env
npm run dev
```
Open the Vite URL shown in the terminal (usually `http://localhost:5173`). The API runs on `http://localhost:4000`.

The SQLite database is created automatically at `server/data/gramcare.sqlite`; demo facilities and health articles are seeded on first run.

## Build and test
```bash
npm test
npm run build
npm start
```
`npm start` starts the built API server. For a production deployment, build the frontend and host `client/dist` as a static site, and deploy the API separately. Configure `VITE_API_URL` to point to the deployed API URL before building the frontend.

## REST API
- `GET /api/health` — service status
- `GET /api/dashboard` — summary counts and latest activity
- `GET /api/patients?search=` — list patients
- `POST /api/patients` — create patient
- `GET /api/patients/:id` — patient details and observations
- `POST /api/assessments` — create preliminary screening assessment
- `GET /api/assessments?patientId=` — assessment history
- `POST /api/vitals` — record an observation
- `GET /api/facilities?search=&service=` — facility directory
- `GET /api/articles` — health awareness content

## GitHub upload
1. Create a new empty repository on GitHub.
2. Extract this ZIP locally.
3. In a terminal inside the extracted folder:
```bash
git init
git add .
git commit -m "Build GramCare rural healthcare system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Deployment outline
### API (Render, Railway, or another Node host)
- Build command: `npm install && npm run build -w server`
- Start command: `npm run start -w server`
- Set `NODE_ENV=production`
- Set `PORT` to the host-provided port if required.
- **Persistence note:** the default SQLite file is local disk. Use a persistent disk for the database, or migrate to managed PostgreSQL for durable production hosting. Ephemeral filesystems can erase data on redeploy.
- Set `CLIENT_ORIGIN` to the deployed frontend origin.

### Frontend (Vercel or Netlify)
- Root directory: `client`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-DEPLOYED-API`
- Configure the API CORS origin (`CLIENT_ORIGIN`) to match the deployed frontend.

The exact UI labels may differ between hosting providers. Never publish a real healthcare system before security, privacy, clinical, and operational review.

## Remaining setup before live deployment
- Install Node.js and run the local test/build commands.
- Create GitHub repository and push source.
- Deploy backend and frontend separately; configure `VITE_API_URL` and `CLIENT_ORIGIN`.
- Choose persistent database hosting.
- Replace sample facilities/articles with verified content and add real authentication/authorization before any real patient data is used.
