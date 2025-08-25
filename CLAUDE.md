# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack web application for a Girls Club community platform with wellness and social features. The project uses a React/TypeScript frontend with mobile-optimized components and an Express.js backend with PostgreSQL database via Drizzle ORM and Supabase integration.

## Development Commands

### Essential Commands
```bash
# Start development server (runs both frontend and backend on port 5000)
npm run dev

# Build the application for production
npm run build

# Start production server
npm start

# Type check the TypeScript code
npm run check

# Push database schema changes
npm run db:push
```

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI components
- **Backend**: Express.js, Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM, Supabase for auth and real-time features
- **Mobile**: Capacitor for native mobile features, extensive mobile-first components
- **State Management**: React Query (TanStack Query), Context API
- **Authentication**: Supabase Auth with protected routes

### Project Structure
- `/client` - React application with Vite
  - `/src/components` - Reusable UI components organized by feature (auth, events, challenges, etc.)
  - `/src/hooks` - Custom React hooks for data fetching, performance, and mobile features
  - `/src/pages` - Route components including mobile-specific pages
  - `/src/services` - Business logic and API services
  - `/src/ui` - Base UI components (buttons, cards, modals, etc.)
- `/server` - Express.js API server
  - `index.ts` - Server entry point with middleware setup
  - `routes.ts` - API route definitions
  - `storage.ts` - Database access layer
- `/shared` - Shared types and database schema
  - `schema.ts` - Drizzle ORM schema definitions for all database tables
- `/supabase` - Supabase edge functions and migrations

### Key Features
- **Events Management**: Event creation, registration, QR code attendance tracking
- **Challenges & Wellness**: Step tracking challenges, health data monitoring, leaderboards
- **Social Features**: Posts, comments, likes, direct messaging, stories
- **Loyalty System**: Points earning and redemption, rewards store
- **Admin Dashboard**: User management, content moderation, analytics
- **Mobile Optimization**: Extensive mobile-first components, gesture support, offline capabilities

### Database Schema
The application uses PostgreSQL with the following main entities:
- `profiles` - User profiles with loyalty points
- `events` - Community events with registration and attendance tracking
- `challenges` - Wellness challenges with participation tracking
- `socialPosts` - Social feed posts and stories
- `directMessages` - Encrypted messaging between users
- `healthData` - User wellness metrics and step tracking
- `loyaltyTransactions` - Points earning and redemption history

### API Structure
- Server runs on port 5000 (hardcoded for Replit compatibility)
- API routes should be prefixed with `/api`
- Uses Express middleware for logging and error handling
- Database operations use the storage interface pattern

### Mobile Features
- Progressive Web App (PWA) with service worker
- Native mobile features via Capacitor (health tracking, haptic feedback)
- Mobile-specific UI components with iOS/Android styling
- Pull-to-refresh, swipeable cards, gesture controls
- Offline support with local caching strategies

### Performance Optimizations
- Virtual scrolling for large lists
- Image compression and lazy loading
- Message caching and encryption workers
- Smart request batching and debouncing
- Connection status monitoring with retry logic