# Overview

This is a comprehensive business intelligence dashboard application built with React and Express. It features user authentication, role-based access control, post-login onboarding, and a conditional dashboard UI. The application provides AI-powered business insights, inventory management, sales intelligence, customer analytics, return abuse detection, global payment reconciliation, and a restock autopilot system based on user roles and onboarding preferences. The business vision is to provide a powerful, intelligent platform for e-commerce businesses to manage operations, optimize inventory, and gain deep insights, with the ambition of becoming a leading BI tool in the e-commerce space.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Components**: shadcn/ui with Radix UI primitives.
- **Styling**: Tailwind CSS with CSS custom properties for theming (dark theme with light green accents).
- **Routing**: Wouter for client-side routing with protected routes.
- **State Management**: TanStack Query (React Query) for server state and caching.
- **Forms**: React Hook Form with Zod validation for type-safe handling.
- **UI/UX Decisions**: Conditional dashboard panels based on onboarding data and user roles. Features visual charts, bar graphs, and interactive elements.

## Backend Architecture
- **Runtime**: Node.js with Express.
- **Language**: TypeScript with ES modules.
- **Authentication**: Passport.js with local strategy for username/password authentication.
- **Session Management**: Express sessions with configurable storage (memory or PostgreSQL).
- **Password Security**: Node.js crypto module with scrypt for secure hashing.
- **API Design**: RESTful endpoints with `/api` prefix.
- **Core Functionality**:
    - **Authentication & Authorization**: Session-based, three-tier role hierarchy (admin, manager, viewer) with client-side and server-side protected routes.
    - **Global Payment Reconciliation**: Multi-platform (Amazon UK/US, Shopify, Flipkart) and multi-currency processing with automated matching, mismatch detection, and task integration.
    - **Restock Autopilot**: Supplier management, AI-powered reorder suggestions based on stock, sales velocity, lead times, and safety buffers, and automated purchase order generation with multi-currency support.
    - **Inventory Management**: Comprehensive page with color-coded stock levels, import functionality (CSV with drag-and-drop), and intelligent calculations (Days Left = Stock/Velocity).
    - **Sync Management**: Sync adapters for Shopify, Amazon, and Meta platforms with manual triggers, real-time status display, and auto-sync functionality (every 30 minutes).
    - **Notification System**: P1 task notification service sending alerts to Microsoft Teams (webhook) with email fallback (SMTP).
    - **User Preferences/Platform Connections**: Persistent backend storage for user's selected platforms.

## Data Storage
- **Database**: PostgreSQL via Neon serverless database.
- **ORM**: Drizzle ORM for type-safe queries and migrations.
- **Schema**: User table with role-based permissions, ReconBatch, ReconRow, Suppliers, ReorderPolicies, and PurchaseOrders models with audit trail support.
- **Session Storage**: Configurable between memory store (development) and PostgreSQL (production).

# External Dependencies

- **@neondatabase/serverless**: Serverless PostgreSQL database connection.
- **drizzle-orm**: Type-safe database ORM.
- **passport & passport-local**: Authentication middleware.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store adapter.
- **nodemailer**: Email delivery for notifications.
- **@radix-ui/***: Unstyled, accessible UI component primitives.
- **@tanstack/react-query**: Server state management.
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Form validation resolvers.
- **zod**: Runtime type validation.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Utility for creating variant-based component APIs.
- **clsx**: Conditional CSS class utility.
- **vite**: Development server and build tool.
- **tsx**: TypeScript execution engine.
- **esbuild**: JavaScript bundler.
- **drizzle-kit**: Database migration tools.