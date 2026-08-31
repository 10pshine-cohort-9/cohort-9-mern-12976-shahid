# Notes App — MERN Stack

A full-stack notes management application built with the MERN stack (MongoDB, Express, React, Node.js). Users can register, log in, create rich-text notes, and manage their profile with an avatar upload. The project covers secure authentication, image handling via Cloudinary, rate limiting, structured logging, and full test coverage on both ends.

---

## Features

- **User Authentication** — Register, login, and logout with JWT stored in HTTP-only cookies
- **Protected Routes** — Frontend and backend both guard routes that require authentication
- **Notes CRUD** — Create, read, update, and delete personal notes with rich-text content
- **Rich Text Editor** — Tiptap-powered editor with bold, italic, underline, headings, lists, links, and inline images
- **Profile Management** — Update name, password, and upload a profile avatar
- **Image Uploads** — Cloudinary integration for profile pictures and note editor images
- **Input Validation** — Server-side validation with `express-validator` on all mutation routes
- **Rate Limiting** — Separate limiters for overall traffic and auth endpoints
- **Security** — Helmet headers, CORS allow-list, bcrypt password hashing, body size limits
- **Logging** — Structured JSON logging with Pino
- **Test Coverage** — Mocha + Chai + Supertest (backend), Jest + React Testing Library (frontend)

---

## Tech Stack

### Backend
| Layer | Library |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Image Storage | Cloudinary + Multer |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Logging | Pino + pino-http |
| Security | Helmet, CORS, Compression |
| Testing | Mocha, Chai, Supertest, mongodb-memory-server |
| Coverage | c8 |

### Frontend
| Layer | Library |
|---|---|
| UI Framework | React 19 + Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Rich Text Editor | Tiptap |
| HTTP Client | Axios |
| Notifications | react-hot-toast |
| SEO | react-helmet-async |
| Icons | Lucide React |
| Testing | Jest + React Testing Library |
| Build | Vite 8 |

---
## Getting Started

### Prerequisites

- Node.js v18+
- npm v9+
- A running MongoDB instance (local or Atlas)
- A Cloudinary account (free tier works)

### Environment Variables

Create a `.env` file inside the `backend/` directory. The app will not start without these:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/notesapp

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS — comma-separated list of allowed origins
CORS_ORIGIN=http://localhost:5173
```

### Installation

Install dependencies for both backend and frontend:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Running the App

Run backend and frontend in separate terminals:

```bash
# Terminal 1 — Backend (http://localhost:3000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

## API Reference

All endpoints are prefixed with `/api`. Authentication uses HTTP-only cookies set on login.

### Auth Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Login and receive auth cookie |
| `POST` | `/api/auth/logout` | Yes | Clear auth cookie |
| `GET` | `/api/auth/profile` | Yes | Get current user profile |
| `PUT` | `/api/auth/profile` | Yes | Update name or password |

**Register / Login body:**
```json
{
  "name": "Shahid Ali",
  "email": "shahid@example.com",
  "password": "secret123"
}
```

---

### Notes Endpoints

All notes routes require authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notes` | Get all notes for the logged-in user |
| `POST` | `/api/notes` | Create a new note |
| `GET` | `/api/notes/:id` | Get a single note by ID |
| `PUT` | `/api/notes/:id` | Update a note by ID |
| `DELETE` | `/api/notes/:id` | Delete a note by ID |

**Create / Update body:**
```json
{
  "title": "My Note Title",
  "content": "<p>Rich text HTML content here</p>"
}
```

---

### Upload Endpoints

All upload routes require authentication. Send requests as `multipart/form-data` with the field name `image`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload/profile` | Upload profile avatar (max 5 MB, JPEG/PNG/WEBP) |
| `POST` | `/api/upload/note-image` | Upload an image for use inside a note editor |

---

## Testing

### Backend

```bash
cd backend

# Run all tests once
npm test

# Watch mode
npm run test:watch

# Generate coverage report (lcov + text)
npm run test:coverage
```

Tests use `mongodb-memory-server` so no real database connection is required. Coverage output is in `backend/coverage/`.

### Frontend

```bash
cd frontend

npm test

npm run test:watch

npm run test:coverage

npm run test:ci
```
