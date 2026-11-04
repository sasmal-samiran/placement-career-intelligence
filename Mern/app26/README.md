# Career Pilot Frontend

Attractive Bootstrap + React + TypeScript frontend for the Career Pilot student career platform.

## Install

```bash
npm install
npm run dev
```

## Backend URL

Copy `.env.example` to `.env` and change:

```env
VITE_API_URL=http://localhost:5000/api
```

The frontend already sends the JWT as:

`Authorization: Bearer <token>`

## Pages

- Login
- Register
- Dashboard
- Student Profile
- Academic Performance
- Attendance
- Skills
- Projects
- Internships
- Certifications
- Coding Profile
- Resume & Portfolio
- Placement Prediction
- AI Career Mentor

## Important

The login/register pages have a temporary demo fallback so you can see the UI before the Express server is ready. Once your backend returns:

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "studentId": "..."
  }
}
```

the same frontend will use the real authentication response.

The CRUD pages currently contain demo state. Next, connect each page's buttons to the Express/MongoDB endpoints.
