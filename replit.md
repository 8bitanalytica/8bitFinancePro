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
The application now uses PostgreSQL with five main tables:
- `general_transactions`: For tracking personal income/expenses with account-specific currency support
- `properties`: For managing real estate properties
- `real_estate_transactions`: For tracking property-related transactions
- `devices`: For managing technology devices and equipment with receipt/device images, warranty tracking, and expiration alerts
- `device_transactions`: For tracking device-related expenses and maintenance

### Currency Architecture
The application implements a per-account currency system where:
- Each bank account has its own currency setting
- Transaction amounts are displayed using the currency of the associated account
- Transfer transactions show amounts in the respective account currencies
- Global currency setting remains for backward compatibility and as default for new accounts
- **Automatic Currency Conversion**: Transfer transactions between accounts with different currencies automatically fetch real-time exchange rates
- **Exchange Rate API**: Uses ExchangeRate.host API for live currency conversion without requiring API keys
- **Conversion Display**: Shows original amount, converted amount, exchange rate, and timestamp in transfer modals
- **Transaction History**: Exchange rate information is automatically saved in transaction descriptions for future reference

### Settings System
The application includes a comprehensive settings system with:
- **Per-Account Currency**: Each bank account has its own currency setting, allowing multi-currency financial management
- **Currency Selection**: Support for 10 major currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BRL)
- **Expense Categories**: Customizable categories for each module (general, real estate, devices)
- **Bank Account Management**: Multiple bank accounts with visual tracking, types, balances, color coding, and individual currencies
- **Settings Persistence**: All settings stored in localStorage for session persistence
- **Import/Export**: Settings backup and restore functionality
- **Technology Stack Documentation**: Complete VPS setup guide with installation commands, dependencies, and production configuration

### Enhanced Device Management
The device management system now includes:
- **Comprehensive Device Tracking**: Support for household appliances and all device types
- **Receipt Management**: Upload and store receipt images with device records
- **Device Images**: Upload and display device photos for easy identification
- **Warranty Expiration Alerts**: Configurable alerts for devices approaching warranty expiration
- **Visual Device Cards**: Enhanced display with device images and warranty status
- **Device Status Tracking**: Active/inactive status tracking for comprehensive device lifecycle management

### Frontend Components
- **Dashboard**: Main application interface with module switching
- **Sidebar**: Navigation between three modules (general, real estate, devices) with settings moved to tools section
- **Modal System**: Reusable modals for adding/editing transactions, properties, and devices
- **Settings Module**: Comprehensive settings management with currency, categories, and bank accounts
- **Bank Account Display**: Visual bank account cards in general finances with color coding and balance tracking
- **UI Components**: Comprehensive set of accessible components from shadcn/ui

### Backend Services
- **Storage Layer**: Abstracted storage interface with PostgreSQL database implementation
- **Route Handlers**: RESTful endpoints for all CRUD operations
- **Validation**: Zod schema validation for all API inputs
- **Database Connection**: Neon PostgreSQL with Drizzle ORM

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