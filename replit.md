# Overview

This is a comprehensive business intelligence dashboard application built with React and Express. It features user authentication, role-based access control, post-login onboarding, and a conditional dashboard UI with dark theme and light green accents. The application provides AI-powered business insights, inventory management, sales intelligence, customer analytics, and return abuse detection based on user roles and onboarding preferences.

## Recent Changes (Latest First)
- **2025-01-08**: Implemented Global Payment Reconciliation V1 system with automated matching algorithms and multi-currency support
- **2025-01-08**: Created reconciliation service with CSV parsing, currency conversion, and payment mismatch detection
- **2025-01-08**: Built comprehensive reconciliation UI with batch management and detailed row-level views
- **2025-01-08**: Added reconciliation API routes for file upload, batch retrieval, and task creation
- **2025-01-08**: Added default due dates for task types (RESTOCK: +24h, RETRY_SYNC: +2h, RECONCILE: +48h)
- **2025-01-08**: Implemented overdue count and "Mine" filter chips in Action Center with real-time counts
- **2025-01-08**: Enhanced task display with overdue highlighting and improved due date formatting
- **2025-01-08**: Implemented P1 task notification system with Teams webhook and email fallback support
- **2025-01-08**: Added purchase orders backend schema, API routes, and inventory integration
- **2025-01-08**: Created comprehensive inventory management page with color-coded stock levels and action buttons
- **2025-01-08**: Added comprehensive sync adapters with mock data for Shopify, Amazon, and Meta platforms
- **2025-01-08**: Implemented sync management UI with manual trigger buttons and real-time status display
- **2025-01-08**: Created intelligent business logic for inventory alerts, payment mismatches, and ROAS monitoring  
- **2025-01-08**: Added auto-sync functionality running every 30 minutes with optional cron scheduling
- **2025-01-08**: Integrated sync status tracking and sync routes (/api/sync/shopify, /api/sync/amazon, /api/sync/meta, /api/sync/status)
- **2025-01-06**: Removed all AI features access for Viewer role users
- **2025-01-06**: Updated AI Copilot Panel to be Admin/Manager only
- **2025-01-06**: Restricted AI-powered smart alerts and suggestions for Viewers
- **2025-01-06**: Implemented comprehensive role-based access control for dashboard panels and features
- **2025-01-06**: Added user role selector in registration form (Admin, Manager, Viewer) with Admin as default
- **2025-01-06**: Applied role restrictions: Admin sees all, Manager can't access Settings/PO Generator, Viewer sees basic panels only
- **2025-01-06**: Enhanced dashboard header to display user role badge and hide restricted features based on role
- **2025-01-06**: Updated Settings Panel to use persistent backend storage instead of local state for platform connections
- **2025-01-06**: Added database schema to include platformConnections field in user table
- **2025-01-06**: Created backend routes (/api/platforms/connect, /api/platforms/disconnect, /api/platforms/connections) for saving and retrieving platform connection data
- **2025-01-06**: Enhanced frontend to use persistent backend storage instead of local state for platform connections
- **2025-01-06**: Added comprehensive Settings Panel showing user's selected platforms with simulated API key connections
- **2025-01-06**: Implemented CSV import functionality with drag-and-drop interface, data preview, and header cleanup
- **2025-01-06**: Created import buttons in dashboard header for inventory and sales data uploads
- **2025-01-06**: Enhanced Inventory Brain Panel to display imported CSV data with import status badges
- **2025-01-06**: Added smart AI-like features using dummy logic throughout dashboard
- **2025-01-06**: Enhanced AI Copilot Panel with smart responses and 1-second response delay
- **2025-01-06**: Added intelligent Inventory Brain calculations (Days Left = Stock/Velocity formula)
- **2025-01-06**: Implemented smart alerts showing low stock warnings at dashboard top
- **2025-01-06**: Enhanced PO Generator with velocity-based quantity recommendations (velocity × 7 days)
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

## Global Payment Reconciliation V1 System

### Core Features
- **Multi-Platform Support**: Amazon UK/US, Shopify, Flipkart, and other marketplace data ingestion
- **Multi-Currency Processing**: Automated conversion to base currency (INR, GBP, AED, SGD, USD)
- **Automated Matching**: Intelligent order-to-payout reconciliation with configurable tolerance levels
- **Mismatch Detection**: Real-time identification of payment discrepancies with severity classification
- **Task Integration**: Automatic RECONCILE task creation for significant mismatches (>$10 = P1 priority)
- **Comprehensive UI**: Batch management dashboard with detailed row-level investigation views

### Technical Implementation
- **Backend Service**: `server/reconService.ts` - Handles CSV parsing, currency conversion, and matching algorithms
- **API Routes**: `/api/recon/*` endpoints for file upload, batch management, and row operations
- **Frontend Pages**: Reconciliation dashboard (`/recon`) and detail view (`/recon/:batchId`)
- **Database Schema**: ReconBatch and ReconRow models with full audit trail support
- **File Processing**: Multer-based CSV upload with normalized header processing

### Data Flow
1. **Upload**: CSV files (orders + payouts) uploaded via web interface
2. **Processing**: Automated parsing, normalization, and currency conversion
3. **Matching**: Order-to-payout matching with difference calculations
4. **Analysis**: Mismatch detection and severity classification
5. **Action**: Automatic task creation for discrepancies requiring investigation
6. **Resolution**: Manual status tracking and notes for each reconciliation row

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
- **nodemailer**: Email delivery service for SMTP notifications

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

## Notification System Architecture

### P1 Task Notification Service
- **Service Location**: `server/notificationService.ts` and `server/emailService.ts`
- **Trigger**: Automatically called when any P1 priority task is created
- **Teams Integration**: Sends rich card notifications to Microsoft Teams via webhook
- **Email Fallback**: SMTP email notifications when Teams webhook unavailable
- **URL Generation**: Automatic deep linking to Action Center with task filtering

### Environment Configuration
**Teams Webhook (Primary)**:
- `TEAMS_WEBHOOK_URL`: Microsoft Teams incoming webhook URL

**SMTP Email (Fallback)**:
- `SMTP_HOST`: Email server hostname
- `SMTP_PORT`: Email server port (587 for TLS, 465 for SSL)
- `SMTP_SECURE`: "true" for SSL, "false" for TLS
- `SMTP_USER`: Email authentication username
- `SMTP_PASS`: Email authentication password
- `SMTP_FROM`: Sender email address
- `NOTIFICATION_EMAIL`: Recipient email (defaults to SMTP_FROM)

### Integration Points
- **Task Creation**: Integrated into `storage.createTask()` method
- **Non-blocking**: Notifications sent asynchronously to avoid blocking task creation
- **Error Handling**: Comprehensive logging for troubleshooting
- **Test Endpoint**: `/api/test/p1-notification` for admin testing