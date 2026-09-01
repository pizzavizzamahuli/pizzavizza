# Pizza Vizza

Pizza Vizza is a future-ready local restaurant platform foundation built with Next.js, TypeScript, Tailwind CSS, and MongoDB-compatible architecture.

## Current Phase
Phase 5: Cart + Checkout + Delivery/Pickup

## Technology Stack
- Next.js 16
- TypeScript
- Tailwind CSS
- MongoDB / MongoDB Atlas readiness
- Git / GitHub

## Local Development
1. Copy `.env.example` to `.env.local` and fill in the required values. Do NOT commit real secrets.

For temporary local testing you may create a `.env.local.test` file and point your local server to it, but remove that file when finished to avoid leaving secrets in the workspace.
3. Run the development server with npm run dev.

## Environment Variables
See .env.example for the full placeholder list.

## Basic Folder Architecture
- app/ — Next.js app router pages and layouts
- src/config/ — environment, database, auth, and permission configuration
- src/lib/ — shared error, validation, and manifest helpers
- src/types/ — shared TypeScript interfaces and enums

## Completed Foundation
- Scalable app structure
- Environment configuration placeholders
- Database connection foundation
- Shared type system for roles, statuses, and address data
- Centralized permission and authorization scaffolding
- Separate customer and admin route foundations
- PWA manifest metadata structure
- Documentation and project status tracking

## Future Development Phases
- Authentication and account foundation
- User and role models
- Protected admin management
- Menu and ordering modules
- Payments, coupons, bookings, and delivery features
