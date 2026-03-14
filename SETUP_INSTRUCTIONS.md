# Setup Instructions - Cafeteria V5 (Local Authentication)

## Prerequisites
- Node.js 18+
- PostgreSQL database
- pnpm package manager

## Installation Steps

### 1. Install Dependencies
```bash
cd cafeteria_project
pnpm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/cafeteria_db

# Authentication
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
VITE_APP_ID=cafeteria_app

# Environment
NODE_ENV=production
PORT=3000
```

### 3. Database Migration
```bash
# Run Drizzle migrations
pnpm drizzle-kit push
```

### 4. Seed Initial Data
```bash
# Create owner account
pnpm tsx server/seed.ts
```

This will create the owner account with:
- **Username:** `yaserras@gmail.com`
- **Password:** `Kamel123321$`

### 5. Start Development Server
```bash
# Development mode (with hot reload)
pnpm dev

# Production mode
pnpm build
pnpm start
```

## First Login

1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Username: `yaserras@gmail.com`
   - Password: `Kamel123321$`
3. You will be redirected to the Owner Dashboard

## Creating Accounts for Others

### As Owner/Admin:

#### Create Root Marketer:
1. Go to Owner Dashboard
2. Use the API endpoint:
```typescript
await trpc.auth.createUserCredentials.mutate({
  entityId: "marketer_id",
  entityType: "marketer",
  username: "marketer_username",
  password: "SecurePass123!"
});
```

#### Create Cafeteria:
1. Use the API endpoint:
```typescript
await trpc.auth.createUserCredentials.mutate({
  entityId: "cafeteria_id",
  entityType: "cafeteria",
  username: "cafeteria_username",
  password: "SecurePass123!"
});
```

#### Create Staff:
1. Use the API endpoint:
```typescript
await trpc.auth.createUserCredentials.mutate({
  entityId: "staff_id",
  entityType: "staff",
  username: "staff_username",
  password: "SecurePass123!"
});
```

## Important Security Notes

⚠️ **CRITICAL:**
1. Change the owner password immediately after first login
2. Use strong passwords (min 8 characters with mixed case and numbers)
3. Never commit `.env` file to version control
4. Keep `JWT_SECRET` secure and unique
5. Use HTTPS in production

## Account Hierarchy

```
Owner (Admin)
├── Root Marketer 1
│   ├── Child Marketer 1.1
│   │   └── Cafeteria 1.1.1
│   │       └── Staff Members
│   └── Child Marketer 1.2
│       └── Cafeteria 1.2.1
│           └── Staff Members
└── Root Marketer 2
    └── Cafeteria 2.1
        └── Staff Members
```

## Changing Password

All users can change their password:
1. Navigate to `/change-password`
2. Enter current password
3. Enter new password (min 8 characters)
4. Confirm new password
5. Click "Change Password"

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure database exists

### Migration Failed
```bash
# Reset database (WARNING: deletes all data)
pnpm drizzle-kit drop

# Re-run migrations
pnpm drizzle-kit push
```

### Seed Script Failed
```bash
# Check if bcryptjs is installed
pnpm install bcryptjs @types/bcryptjs

# Try again
pnpm tsx server/seed.ts
```

### Login Not Working
1. Verify username and password are correct
2. Check account exists in database
3. Ensure password hash was created during seed
4. Check browser console for error messages

## API Documentation

### Login Endpoint
**POST** `/api/trpc/auth.login`
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

### Change Password Endpoint
**POST** `/api/trpc/auth.changePassword`
```json
{
  "oldPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

### Create Credentials Endpoint
**POST** `/api/trpc/auth.createUserCredentials`
```json
{
  "entityId": "entity_id",
  "entityType": "marketer|cafeteria|staff",
  "username": "new_username",
  "password": "new_password"
}
```

## File Structure

```
cafeteria_project/
├── server/
│   ├── routers/
│   │   └── auth.ts          # Authentication router
│   ├── seed.ts              # Database seed script
│   └── db.ts                # Database functions
├── client/
│   └── src/
│       └── pages/
│           ├── Login.tsx                # Login page
│           └── ChangePassword.tsx       # Change password page
├── drizzle/
│   └── schema.ts            # Database schema with new fields
├── AUTHENTICATION_CHANGES.md # Detailed authentication changes
└── SETUP_INSTRUCTIONS.md    # This file
```

## Support

For issues or questions:
1. Check AUTHENTICATION_CHANGES.md for detailed information
2. Review error messages in browser console
3. Check server logs for backend errors
4. Verify database connection and migrations

## Version Info

- **Cafeteria System:** V5
- **Authentication:** Local Username/Password
- **Database:** PostgreSQL with Drizzle ORM
- **Frontend:** React with TypeScript
- **Backend:** Express with tRPC
