# Overview

This is a full-stack web application built with React and Express that provides user authentication and role-based access control. The application features a modern UI built with shadcn/ui components and Tailwind CSS, with a Node.js/Express backend handling authentication via Passport.js. The system supports three user roles (admin, manager, viewer) and includes a comprehensive dashboard interface.

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