# Financial Manager Application

## Overview

This is a full-stack financial management application built with React (frontend) and Express.js (backend), featuring both general finance tracking and real estate property management capabilities. The application uses a modern tech stack with TypeScript, Tailwind CSS, and Drizzle ORM with PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Uses connect-pg-simple for PostgreSQL session storage
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error handling middleware

## Key Components

### Database Schema
The application uses three main tables:
- `general_transactions`: For tracking personal income/expenses
- `properties`: For managing real estate properties
- `real_estate_transactions`: For tracking property-related transactions

### Frontend Components
- **Dashboard**: Main application interface with module switching
- **Sidebar**: Navigation between general finances and real estate modules
- **Modal System**: Reusable modals for adding/editing transactions and properties
- **UI Components**: Comprehensive set of accessible components from shadcn/ui

### Backend Services
- **Storage Layer**: Abstracted storage interface with in-memory implementation
- **Route Handlers**: RESTful endpoints for all CRUD operations
- **Validation**: Zod schema validation for all API inputs

## Data Flow

1. **Client Requests**: Frontend makes HTTP requests to Express API endpoints
2. **Validation**: Request data is validated using Zod schemas
3. **Storage Operations**: Validated data is processed through the storage layer
4. **Response**: JSON responses are sent back to the client
5. **State Management**: TanStack Query manages caching and synchronization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui**: Accessible UI primitives
- **react-hook-form**: Form management
- **zod**: Runtime type validation
- **date-fns**: Date manipulation utilities

### Development Tools
- **Vite**: Build tool and development server
- **ESBuild**: JavaScript bundler for production
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework

## Deployment Strategy

### Development Environment
- Uses Vite dev server for frontend with hot module replacement
- Express server runs with tsx for TypeScript execution
- Database migrations managed through Drizzle Kit
- Replit-specific plugins for development experience

### Production Build
- Frontend: Vite builds optimized static assets
- Backend: ESBuild bundles server code into single file
- Database: Drizzle migrations ensure schema consistency
- Environment: Expects DATABASE_URL environment variable

### Architecture Decisions

**Frontend Framework Choice**: React was chosen for its ecosystem and component reusability. Vite provides fast development experience with modern tooling.

**State Management**: TanStack Query handles server state efficiently, eliminating the need for complex client-side state management for API data.

**UI Components**: shadcn/ui provides accessible, customizable components built on Radix UI primitives, ensuring good UX and accessibility.

**Database Layer**: Drizzle ORM provides type safety and good developer experience while maintaining SQL-like syntax. PostgreSQL offers reliability and advanced features.

**Validation Strategy**: Zod provides runtime validation that works seamlessly with TypeScript, ensuring data integrity across the application.

**Session Management**: PostgreSQL-based sessions provide persistence and scalability compared to in-memory solutions.