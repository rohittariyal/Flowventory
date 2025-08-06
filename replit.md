# Overview

This is a comprehensive business intelligence dashboard application built with React and Express. It features user authentication, role-based access control, post-login onboarding, and a conditional dashboard UI with dark theme and light green accents. The application provides AI-powered business insights, inventory management, sales intelligence, customer analytics, and return abuse detection based on user roles and onboarding preferences.

## Recent Changes (Latest First)
- **2025-01-06**: Fixed onboarding completion persistence issue preventing dashboard access after onboarding
- **2025-01-06**: Completed full design preview mode showing all 7 dashboard panels with complete styling
- **2025-01-06**: Implemented POGeneratorPanel with automated purchase order creation (admin only)
- **2025-01-06**: Enhanced dashboard panels with visual charts, bar graphs, and interactive elements
- **2025-01-05**: Completed comprehensive dashboard UI with conditional panels based on onboarding data
- **2025-01-05**: Implemented AI copilot with contextual business insights and chat interface  
- **2025-01-05**: Added role-based panel access (Return Abuse Detection for admin/manager only)
- **2025-01-05**: Created modular dashboard components: Business Pulse, Inventory Brain, Sales Intelligence, Customer Radar
- **2025-01-05**: Fixed all Tailwind CSS compilation issues and implemented dark theme with green accents

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Routing**: Wouter for client-side routing with protected routes
- **State Management**: TanStack Query (React Query) for server state and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy for username/password auth
- **Session Management**: Express sessions with configurable storage (memory or PostgreSQL)
- **Password Security**: Node.js crypto module with scrypt for secure hashing
- **API Design**: RESTful endpoints with /api prefix

## Data Storage
- **Database**: PostgreSQL via Neon serverless database
- **ORM**: Drizzle ORM with type-safe queries and migrations
- **Schema**: User table with role-based permissions (admin, manager, viewer)
- **Session Storage**: Configurable between memory store (development) and PostgreSQL (production)

## Authentication & Authorization
- **Strategy**: Session-based authentication with Passport.js
- **Password Hashing**: Scrypt algorithm with random salt generation
- **Role System**: Three-tier role hierarchy (admin > manager > viewer)
- **Protected Routes**: Client-side route protection with authentication checks
- **Session Security**: Configurable session secrets and security settings

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **passport & passport-local**: Authentication middleware and local strategy
- **express-session**: Session management middleware
- **connect-pg-simple**: PostgreSQL session store adapter

### UI/UX Libraries
- **@radix-ui/***: Unstyled, accessible UI component primitives
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form state management and validation
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation and schema definition
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **clsx**: Conditional CSS class utility

### Development Tools
- **vite**: Fast development server and build tool
- **tsx**: TypeScript execution engine for Node.js
- **esbuild**: Fast JavaScript bundler for production builds
- **drizzle-kit**: Database migration and introspection tools