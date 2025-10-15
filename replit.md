# PingPong Pro - Tournament Management System

## Overview

PingPong Pro is a comprehensive table tennis tournament management platform designed to organize tournaments, manage athlete registrations, track rankings, and foster community engagement. It supports various tournament formats including single elimination, double elimination, round robin, and Swiss-style. The platform aims to provide a robust and user-friendly experience for both organizers and participants.

## User Preferences

Preferred communication style: Simple, everyday language.

## Deployment Documentation

### Manual Técnico Completo de Deploy Autônomo

O sistema possui documentação completa do processo de deploy autônomo via GitHub + Render, replicável em qualquer projeto Replit:

**📚 Documentos Criados (57KB total):**

1. **🚀-COMECE-AQUI.md** (9.8KB) - ⭐ LEIA PRIMEIRO
   - Resumo visual completo do sistema
   - Guia rápido de uso
   - Fluxo de deploy ilustrado

2. **COMO-REPLICAR.md** (9.9KB) - Guia Executivo
   - Instruções em português
   - Casos de uso práticos
   - Fluxo visual detalhado

3. **TEMPLATE-INSTRUCAO-AGENTE.md** (3.6KB) - ⭐ COPIAR/COLAR
   - Template pronto para outros projetos
   - Instruções completas para agente
   - Apenas trocar 2 variáveis

4. **QUICK-DEPLOY-SETUP.md** (7.3KB) - Setup Manual
   - Passo a passo detalhado
   - Comandos prontos
   - Troubleshooting rápido

5. **DEPLOYMENT-GUIDE.md** (19KB) - Referência Técnica
   - Arquitetura completa do sistema
   - Código explicado linha por linha
   - Troubleshooting avançado

6. **INDICE-DOCUMENTACAO.md** (8KB) - Navegação
   - Guia de navegação completo
   - Comparação de documentos
   - Fluxos de uso

**Sistema de Deploy:**
- Script: `smart-deploy.js` (detecção inteligente de mudanças via SHA)
- Comando: `npm run deploy` (30 segundos + 3-5min rebuild)
- Fluxo: Replit → GitHub (API) → Render (webhook) → Produção
- Autonomia: App funciona 100% sem Replit em produção

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Design**: RESTful API
- **Data Layer**: In-memory storage with interface for future database integration
- **Session Management**: Express sessions with PostgreSQL session store

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL with Neon serverless connection
- **Schema**: Well-defined structures for athletes, tournaments, participants, matches, and communities
- **Migrations**: Drizzle Kit
- **Validation**: Drizzle-Zod integration

### Key Data Models
- **Athletes**: User profiles, rankings, categories, statistics.
- **Tournaments**: Competition management, formats, status tracking.
- **Matches**: Game results and bracket progression.
- **Communities**: Local club and regional organization support.
- **Tournament Participants**: Manages athlete enrollments.

### Authentication & Authorization
- Session-based authentication using Express sessions.
- Role-based access patterns for organizers/participants.
- Secure cookie configuration.

### System Features
- **Optimized Data Endpoints**: Minimal data retrieval for performance-critical components.
- **Smart Loading States**: Enhanced user experience with visual feedback during data fetching.
- **Accurate Financial Management**: Real-time payment status calculation and detailed financial dashboards.
- **Dynamic Match Display & Brackets**: Universal match detection, knockout aggregation, and accurate bracket position display for various tournament phases.
- **Public Tournament Pages**: Simplified phase filtering, complete World Cup-style bracket visualization, crossover seeding, and dynamic page titles.
- **Interactive Information**: "Curiosidades" feature with random table tennis facts.
- **Smart Classification Display**: Real-time standings with highlighting for top positions.
- **Enhanced Photo Upload**: Camera capture and gallery selection with immediate preview for both new and existing athletes.
- **Flexible Category Management**: Dynamic category filtering, age/technical category selection, and backend validation for eligibility.
- **Robust Registration Logic**: Online registration deadlines, direct athlete enrollment conditions, and correct BYE match detection.

## External Dependencies

### Database & Storage
- **@neondatabase/serverless**: Neon database connectivity.
- **drizzle-orm**: ORM for database operations.
- **drizzle-kit**: Database schema management.
- **connect-pg-simple**: PostgreSQL session store.

### UI & Styling
- **@radix-ui/***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant handling.
- **clsx**: Conditional className utility.
- **lucide-react**: Icon library.

### Development & Build
- **vite**: Build tool and development server.
- **@vitejs/plugin-react**: React support for Vite.
- **@replit/vite-plugin-runtime-error-modal**: Replit error reporting.
- **@replit/vite-plugin-cartographer**: Development tooling integration.

### Data Management
- **@tanstack/react-query**: Data fetching and caching.
- **react-hook-form**: Form management.
- **@hookform/resolvers**: Validation resolvers.
- **zod**: Runtime type validation.

### Date & Utilities
- **date-fns**: Date utility library.
- **nanoid**: Unique ID generator.
- **cmdk**: Command palette component.