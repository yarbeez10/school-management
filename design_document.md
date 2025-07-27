# Educational Task Management System - Design Document

## 1. System Overview

The Educational Task Management System is a web application that enables teachers to create subjects, manage students, assign tasks, and track progress. Students can register for subjects, complete assigned tasks, and upload files.

### Key Features
- User authentication (Teacher/Student roles)
- Subject management
- Task assignment and completion
- File upload system
- Progress tracking

## 2. Technology Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/ui** for component library
- **React Hook Form** for form management
- **Zod** for form validation

### Backend
- **Next.js API Routes** (Full-stack)
- **Node.js** runtime
- **Express.js** middleware integration
- **SQLite** database
- **Prisma** ORM for database management
- **Multer** for file uploads

### Additional Libraries
- **NextAuth.js** for authentication (custom provider)
- **Lucide React** for icons
- **date-fns** for date manipulation
- **clsx** for conditional styling

## 3. Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('TEACHER', 'STUDENT')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE NOT NULL,
  teacher_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student enrollments
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(student_id, subject_id)
);

-- Tasks table
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  subject_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  due_date DATETIME,
  max_points INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task submissions
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  content TEXT,
  file_path TEXT,
  status TEXT CHECK(status IN ('PENDING', 'SUBMITTED', 'GRADED')) DEFAULT 'PENDING',
  points_earned INTEGER,
  feedback TEXT,
  submitted_at DATETIME,
  graded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(task_id, student_id)
);
```

## 4. System Architecture

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── teacher/
│   │   └── student/
│   ├── api/               # API routes
│   │   ├── auth/
│   │   ├── subjects/
│   │   ├── tasks/
│   │   └── submissions/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # Reusable components
│   ├── ui/               # Shadcn components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── shared/           # Shared components
├── lib/                  # Utility functions
│   ├── auth.ts          # Authentication logic
│   ├── db.ts            # Database connection
│   ├── utils.ts         # General utilities
│   └── validations.ts   # Zod schemas
├── types/               # TypeScript definitions
├── hooks/               # Custom React hooks
└── middleware.ts        # Next.js middleware
```

## 5. Core Components

### Authentication System
- Custom credential-based authentication
- Password hashing with bcrypt
- JWT session management
- Role-based access control
- Protected routes middleware

### User Management
- User registration with role selection
- Profile management
- Password reset functionality

### Subject Management
- Create/edit subjects (Teachers only)
- Subject enrollment system
- Student roster management

### Task System
- Task creation with rich text description
- Due date management
- File attachment support
- Task assignment to enrolled students

### Submission System
- File upload with validation
- Submission status tracking
- Grading system with feedback
- Progress analytics

## 6. User Interfaces

### Teacher Dashboard
- Subject overview cards
- Recent tasks and submissions
- Student progress analytics
- Quick actions panel

### Student Dashboard
- Enrolled subjects overview
- Pending tasks list
- Recent submissions
- Grade summary

### Shared Components
- Navigation header with role-based menu
- Sidebar navigation
- Notification system
- File upload components
- Data tables with sorting/filtering

## 7. API Design

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Subject Endpoints
- `GET /api/subjects` - List subjects (filtered by role)
- `POST /api/subjects` - Create subject (teacher only)
- `GET /api/subjects/[id]` - Get subject details
- `PUT /api/subjects/[id]` - Update subject (teacher only)
- `DELETE /api/subjects/[id]` - Delete subject (teacher only)
- `POST /api/subjects/[id]/enroll` - Enroll in subject (student only)

### Task Endpoints
- `GET /api/tasks` - List tasks (filtered by role/subject)
- `POST /api/tasks` - Create task (teacher only)
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task (teacher only)
- `DELETE /api/tasks/[id]` - Delete task (teacher only)

### Submission Endpoints
- `GET /api/submissions` - List submissions
- `POST /api/submissions` - Submit task (student only)
- `GET /api/submissions/[id]` - Get submission details
- `PUT /api/submissions/[id]` - Update submission/grade
- `POST /api/upload` - File upload endpoint

## 8. Security Considerations

### Authentication Security
- Password hashing with bcrypt (12 rounds)
- JWT tokens with expiration
- Secure HTTP-only cookies
- CSRF protection

### Authorization
- Role-based access control
- Route protection middleware
- API endpoint authorization
- Resource ownership validation

### File Upload Security
- File type validation
- File size limits
- Secure file storage

### Data Validation
- Input sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection
- Rate limiting

## 9. Performance Optimizations

### Frontend
- Next.js Image optimization
- Code splitting and lazy loading
- Client-side caching
- Optimistic updates

### Backend
- Database indexing
- Query optimization
- API response caching
- File upload progress tracking

### Database
- Proper indexing on foreign keys
- Connection pooling
- Query optimization
- Data pagination