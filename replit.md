# PingPong Pro - Tournament Management System

## Overview

PingPong Pro is a comprehensive table tennis tournament management platform built with modern web technologies. It provides tools for organizing tournaments, managing athlete registrations, tracking rankings, and facilitating community engagement around table tennis competitions. The system supports multiple tournament formats including single elimination, double elimination, round robin, and Swiss-style tournaments.

### Latest Updates (October 2025)

**Public Match View Enhancement (Oct 2 - Latest):**
- **Full Parity with Internal View**: Public match pages now mirror the internal "Partidas" tab exactly in functionality and appearance
- **Complete Match Display**: All matches visible regardless of status (pending, in_progress, completed)
- **Professional UI**: White card backgrounds with proper contrast, identical to admin view
- **Athlete Photos**: Avatar display with photoUrl support, including proper ID normalization (string comparison)
- **Visual Feedback**: Color-coded status badges (green for completed, yellow for in-progress, gray for pending)
- **Set Details**: Orange/amber colored set scores for completed matches
- **Match Metadata**: Table number and match number displayed for each game
- **Trophy Indicators**: Yellow trophy icon (🏆) shown next to winning player's score
- **Smart Filtering**: Category, phase, and group filters working correctly with English database values

**Photo Upload Enhancement (Oct 2):**
- **Camera Capture Support**: Athletes can now take photos directly with their device's camera using HTML5 `capture="user"` attribute
- **Gallery Selection**: Alternative option to select existing photos from device gallery
- **Existing Athletes**: Users with existing accounts now see photo upload option during tournament registration
- **Memory Management**: Proper cleanup of object URLs to prevent memory leaks during multiple uploads
- **Preview System**: Immediate photo preview for both new and existing athletes, showing current photo if available
- **Mobile-First UX**: Separate "Tirar Foto" and "Escolher Arquivo" buttons for better mobile experience
- **Validation**: Photo remains mandatory for all registrations (new and existing athletes)

**Category Management Fixes (Oct 2):**
- **V40 Age Validation**: Fixed gender matching from "misto" to "mista" allowing 40-year-old athletes to register
- **Proper Category Ordering**: Age categories sorted by minimum age, technical categories follow Iniciante → Absoluto A/B/C/D
- **Gender Suffix Normalization**: Categories with suffixes (e.g., "Absoluto A Feminino") now sort correctly with base categories
- **Database Cleanup**: Removed 26 duplicate/test categories, renamed Veterano to V40/V45/V50 format

**Public Registration Category Improvements:**
- **Flexible Category Selection**: Users can now select either age category OR technical category (or both), instead of requiring both
- **Dynamic Category Filtering**: Age categories (e.g., "Sub-13", "Sub-15") separated from technical categories (e.g., "Absoluto A", "Absoluto B")
- **Database-Driven Categories**: Technical categories are now fetched from the database instead of being hardcoded
- **Smart Validation**: Backend validates eligibility (age and gender) for ALL selected categories, ensuring proper compliance
- **Improved UX**: Clear labels with helper text "(opcional; selecione ao menos uma)" and visual alerts when no category is selected

**Tournament Registration Logic Enhancement:**
- **Online Registration**: Blocked after registration deadline or when tournament status is not 'draft' or 'registration_open'
- **Direct Athlete Enrollment**: Only permitted when tournament is in 'paused' status and category is still in initial phase (no bracket generated)
- **Smart BYE Detection**: Corrected logic to only mark matches as BYE when explicitly designated, preventing incorrect auto-completion of legitimate matches
- **Bracket Visualization**: Fixed World Cup-style elimination brackets to properly separate group stage from elimination phases

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation for type-safe forms
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API endpoints with consistent error handling
- **Data Layer**: In-memory storage implementation with interface for future database integration
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Development**: Hot module replacement with Vite middleware integration

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL with Neon serverless connection
- **Schema**: Well-defined table structures for athletes, tournaments, participants, matches, and communities
- **Migrations**: Drizzle Kit for database schema management
- **Validation**: Drizzle-Zod integration for runtime type validation

### Key Data Models
- **Athletes**: User profiles with rankings, categories, and statistics
- **Tournaments**: Competition management with various formats and status tracking
- **Matches**: Game results and bracket progression
- **Communities**: Local club and regional organization support
- **Tournament Participants**: Junction table managing athlete enrollments

### Authentication & Authorization
- Session-based authentication using Express sessions
- Role-based access patterns prepared for organizer/participant distinctions
- Secure cookie configuration for production deployment

### Frontend Components
- **Reusable UI Components**: Comprehensive component library using Radix primitives
- **Form Components**: Standardized form handling with validation feedback
- **Data Display**: Tournament cards, ranking tables, and athlete profiles
- **Navigation**: Responsive navbar with mobile-friendly design
- **Theming**: Light/dark mode support with CSS custom properties

### API Structure
- **RESTful Endpoints**: CRUD operations for all major entities
- **Consistent Response Format**: Standardized JSON responses with error handling
- **Query Parameters**: Filtering and pagination support
- **Validation**: Request validation using Zod schemas
- **Error Handling**: Centralized error middleware with appropriate HTTP status codes

## External Dependencies

### Database & Storage
- **@neondatabase/serverless**: Serverless PostgreSQL connection for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI & Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant handling for components
- **clsx**: Conditional className utility
- **lucide-react**: Icon library for consistent iconography

### Development & Build
- **vite**: Fast build tool and development server
- **@vitejs/plugin-react**: React support for Vite
- **@replit/vite-plugin-runtime-error-modal**: Enhanced error reporting for Replit
- **@replit/vite-plugin-cartographer**: Development tooling integration

### Data Management
- **@tanstack/react-query**: Powerful data fetching and caching library
- **react-hook-form**: Performant forms with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for React Hook Form
- **zod**: Runtime type validation and schema definition

### Date & Utilities
- **date-fns**: Modern date utility library
- **nanoid**: URL-safe unique ID generator
- **cmdk**: Command palette component for enhanced UX

## Automated Deployment System

### Auto-Deploy Configuration
The project includes an automated deployment system that monitors file changes and automatically deploys to production without manual intervention.

**Features:**
- **File Monitoring**: Watches all source files (client/src, server, shared) for changes
- **Automatic Git Operations**: Auto-commits and pushes changes to GitHub
- **Production Deployment**: Render automatically deploys when GitHub receives updates
- **Smart Timing**: Waits 3 seconds after last change to batch multiple file saves

### Usage Instructions

**Option 1: Manual Start**
```bash
npm run auto-deploy
```

**Option 2: Development + Auto-Deploy**
```bash
./start-with-autodeploy.sh
```

**Workflow:**
1. Edit any file in the Replit project
2. Save the file (Ctrl+S)
3. Auto-deploy detects change and schedules deployment
4. After 3 seconds, commits and pushes to GitHub
5. Render automatically builds and deploys to production
6. Production site updates within 3-5 minutes

**Monitoring:**
- Console shows deployment status and timestamps
- Production URL: https://pingpro.onrender.com
- Build logs available in Render dashboard

### Manual Deployment Commands

**Deploy Inteligente (Recomendado):**
```bash
node smart-deploy.js
```
- **🤖 Detecção automática**: Descobre arquivos modificados via SHA comparison
- **📦 Batching inteligente**: Agrupa arquivos por prioridade e tamanho
- **⚡ Sem rate limiting**: Delays apropriados e exponential backoff
- **🎯 Deploy completo**: Envia todas as mudanças (adds/updates/deletes)
- **🔄 Idempotente**: Pode reexecutar com segurança
- **Exemplo**: 10 arquivos deployados em 1 batch (3 novos, 1 atualizado, 6 deletados)

**Deploy Rápido (Limitado):**
```bash
node simple-deploy.js
```
- Deploy apenas de 2 arquivos específicos hardcoded
- ⚠️ **ATENÇÃO**: Pode perder outras modificações importantes
- Apenas para emergências em arquivos específicos

**Deploy API Completo:**
```bash
node api-deploy.js
```
- Deploy de todos os arquivos do projeto (201 arquivos)
- Pode enfrentar rate limiting com muitos arquivos
- Cria 1 blob por arquivo (200+ API calls)

**Deploy Automático:**
```bash
node auto-deploy.js
```
- Monitora mudanças em tempo real
- Deploy automático após 3 segundos de inatividade
- Útil durante desenvolvimento ativo