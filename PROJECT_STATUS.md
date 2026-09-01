# Pizza Vizza Project Status

## Current Phase
Phase 16: Customer experience, navigation, and order management

## Completed Work
- Added MongoDB-backed auth, session handling, role-based customer/admin routing, and protected account access.
- Implemented product/menu browsing, cart, checkout, addresses, orders, dining rooms, and dining bookings.
- Added server-side promo, wallet, and referral support with order-level validation and reward handling.
- Added admin management for coupons, referrals, and wallet balances.
- Implemented customer-facing order, booking, wallet, and referral experiences tied to existing backend data.
- Replaced the previous placeholder shell with a responsive customer navigation experience.

## Architecture Decisions
- Keep authentication and session logic on the server.
- Use MongoDB collections with reusable connection caching and server-authoritative pricing/validation.
- Separate customer and admin routes and enforce access server-side.
- Surface existing backend features through the customer shell rather than creating duplicate flows.

## Installed Dependencies
- next
- react
- react-dom
- zod
- mongodb
- bcryptjs
- nodemailer

## Important Files
- app/account/page.tsx
- app/account/orders/page.tsx
- app/account/bookings/page.tsx
- app/account/addresses/page.tsx
- app/account/wallet/page.tsx
- app/account/referrals/page.tsx
- app/page.tsx
- src/app-shell.tsx
- src/models/order.ts
- src/models/dining-booking.ts
- src/models/wallet.ts
- src/models/referral.ts
- src/services/order-service.ts
- src/services/promo-service.ts

## Environment Variables
- MONGODB_URI
- MONGODB_DB_NAME
- AUTH_SECRET
- INITIAL_ADMIN_EMAIL
- INITIAL_ADMIN_PASSWORD
- INITIAL_ADMIN_NAME
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_APP_PASSWORD
- SMTP_FROM
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- TELEGRAM_BOT_TOKEN
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- GOOGLE_MAPS_API_KEY

## Validation Status
- Build: passed via `npm run build`
- Lint: passed via `npm run lint`
- Preview server: responding on localhost:3001

## Known Issues
- Main Admin seed requires `INITIAL_ADMIN_*` values in `.env.local`.
- Some features still depend on valid external service credentials for full production behavior.
- Customer wallet/referral pages rely on the existing backend collections and will show empty states until data exists.

## Next Focus
- Improve order detail and booking detail presentation.
- Add stronger empty/error states for checkout and payment flows.
- Continue polishing the customer experience around menu, cart, checkout, and account navigation.

