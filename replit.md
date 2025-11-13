# SkillCam - AI-Powered Skill Training Platform

## Overview

SkillCam is a web application designed to provide scalable, objective assessment of skill performance through AI-assisted video evaluation and trainer oversight. The platform enables trainees (students learning hands-on skills like CNC machining, welding, electrical work) to upload videos of their work, receive automated AI feedback, and get personalized trainer reviews. The system streamlines the skill evaluation process by combining AI efficiency with human expertise.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and data fetching
- **Tailwind CSS** with custom configuration for styling

**UI Component System:**
- **shadcn/ui** component library (Radix UI primitives) following the "new-york" style variant
- Custom component library built on Radix UI primitives including cards, forms, buttons, dialogs, and data visualization components
- Design system emphasizes clarity over decoration, inspired by Linear, Asana, and Notion
- Typography: Inter for UI/body text, Space Grotesk for headings
- Color system using CSS custom properties with HSL values for theme flexibility

**State Management:**
- React Query for server state (submissions, evaluations, feedback)
- Local component state for UI interactions
- localStorage for client-side authentication persistence
- Session-based authentication state synchronized between client and server

**Key Frontend Pages:**
- Landing page for unauthenticated users
- Login/registration with role selection (trainee/trainer)
- Trainee dashboard showing submission history and statistics
- Video upload workflow with metadata form
- Feedback detail view displaying AI evaluation and trainer comments
- Trainer review interface for evaluating submissions

### Backend Architecture

**Technology Stack:**
- **Express.js** server with TypeScript
- **Neon (Serverless PostgreSQL)** via `@neondatabase/serverless` driver
- **Drizzle ORM** for type-safe database queries and schema management
- **express-session** for session-based authentication with secure cookie configuration

**API Design Pattern:**
- RESTful API endpoints organized by resource type
- Middleware-based authentication and authorization
- Role-based access control (trainee vs trainer roles)
- Session-based auth flow (no JWT tokens, uses server-side sessions)

**Authentication & Authorization:**
- Password hashing using bcrypt (10 salt rounds)
- Session middleware with configurable secret
- Role-based middleware (`requireAuth`, `requireRole`) for protecting routes
- Users default to trainee role on registration for security

**Key API Endpoints:**
- `/api/auth/register` - User registration with role assignment
- `/api/auth/login` - Session-based authentication
- `/api/submissions` - CRUD operations for video submissions
- `/api/submissions/:id/details` - Detailed submission view with evaluations
- Trainer-specific routes for reviewing and providing feedback

### Data Storage Architecture

**Database:**
- PostgreSQL (via Neon serverless) configured through Drizzle ORM
- Connection pooling via `@neondatabase/serverless` Pool
- WebSocket constructor override for serverless compatibility

**Schema Design:**

**Users Table:**
- UUID primary key (auto-generated)
- Username (unique), hashed password, role field
- Timestamp for account creation
- Roles: "trainee" (default) and "trainer"

**Submissions Table:**
- UUID primary key
- Foreign key to users table
- Task metadata: taskName, toolType, difficulty, notes
- videoUrl for storing video location (currently file names, extensible for cloud storage)
- Status workflow: pending → ai-evaluated → trainer-reviewed/approved
- Timestamp for submission tracking

**AI Evaluations Table:**
- Links to submissions via foreign key
- Quantitative metrics: accuracy, stability scores
- Qualitative data: completion time, overall score, detailed feedback text
- Separate table allows one-to-one relationship with submissions

**Trainer Feedback Table:**
- Links to submissions via foreign key
- Trainer-specific evaluation data: comments, scores, improvement suggestions
- Timestamp for feedback tracking
- Separate from AI evaluation to maintain clear data separation

**Storage Pattern:**
- Repository pattern implementation in `server/storage.ts`
- Interface-based design (`IStorage`) for potential multiple storage backends
- DatabaseStorage class implements all CRUD operations
- Uses Drizzle ORM query builder for type-safe database operations

### External Dependencies

**Third-Party UI Libraries:**
- Radix UI primitives (accordion, dialog, dropdown, select, tabs, toast, etc.) for accessible components
- Recharts for data visualization and performance charts
- Lucide React for consistent iconography
- date-fns for date formatting and manipulation
- cmdk for command palette functionality

**Authentication & Security:**
- bcrypt for password hashing
- express-session for session management
- connect-pg-simple (imported but session store can be configured)

**Database & ORM:**
- @neondatabase/serverless for Neon PostgreSQL connectivity
- Drizzle ORM for schema definition and type-safe queries
- drizzle-kit for migrations and schema management
- ws (WebSocket) library for Neon's WebSocket-based connections

**Development Tools:**
- Replit-specific plugins for development (vite-plugin-runtime-error-modal, cartographer, dev-banner)
- TypeScript for type safety across frontend and backend
- ESBuild for server-side bundling in production

**Video Storage (Planned):**
- Current implementation stores video file names
- Architecture supports future integration with cloud storage (S3, Cloudinary, etc.)
- videoUrl field in submissions table prepared for full URLs

**AI Evaluation Service (Placeholder):**
- System designed to integrate with external AI/ML services
- AI evaluation creation endpoint exists but awaits actual AI service integration
- Schema supports storing structured AI feedback (accuracy, stability, timing metrics)