# Authentication System Changes - Cafeteria V5

## Overview
The authentication system has been completely refactored from OAuth-based (Manus) to a local username/password system with hierarchical account creation.

## Key Features

### 1. **Owner Credentials**
- **Username:** `yaserras@gmail.com`
- **Password:** `Kamel123321$`
- **Role:** Admin (System Owner)

### 2. **Account Creation Rules**
- **No Public Sign-up:** The system does NOT allow random user registration
- **Hierarchical Creation:** All accounts must be created by their parent/admin:
  - Owner creates Root Marketers
  - Root Marketers create Child Marketers
  - Marketers create Cafeterias
  - Cafeteria Admins create Staff Members
  
### 3. **Account Types**
Each account type can have login credentials:
- **Users** (in `users` table)
- **Marketers** (in `marketers` table)
- **Cafeterias** (in `cafeterias` table)
- **Staff Members** (in `cafeteriaStaff` table)

### 4. **Password Management**
- All passwords are hashed using **bcryptjs** with 10 salt rounds
- Each user can change their own password from their profile
- Passwords must be at least 8 characters long

## Database Schema Changes

### New Fields Added to Tables:

#### `users` table:
```sql
- loginUsername VARCHAR(320) UNIQUE
- passwordHash TEXT
```

#### `marketers` table:
```sql
- loginUsername VARCHAR(320) UNIQUE
- passwordHash TEXT
```

#### `cafeterias` table:
```sql
- loginUsername VARCHAR(320) UNIQUE
- passwordHash TEXT
```

#### `cafeteriaStaff` table:
```sql
- loginUsername VARCHAR(320) UNIQUE
- passwordHash TEXT
```

## API Endpoints

### Authentication Routes (`/api/trpc/auth`)

#### 1. **Login**
```typescript
auth.login({
  username: string,
  password: string
})
```
- Returns session token in cookie
- Searches across all entity types (users, marketers, cafeterias, staff)
- Returns user type and name

#### 2. **Change Password**
```typescript
auth.changePassword({
  oldPassword: string,
  newPassword: string
})
```
- Protected endpoint (requires authentication)
- Verifies old password before allowing change
- Requires minimum 8 characters for new password

#### 3. **Create User Credentials** (Admin Only)
```typescript
auth.createUserCredentials({
  entityId: string,
  entityType: "marketer" | "cafeteria" | "staff",
  username: string,
  password: string
})
```
- Admin-only endpoint
- Creates login credentials for existing entities
- Prevents duplicate usernames

#### 4. **Get Current User**
```typescript
auth.me()
```
- Returns current authenticated user info
- Public endpoint (returns null if not authenticated)

#### 5. **Logout**
```typescript
auth.logout()
```
- Clears session cookie
- Public endpoint

## Frontend Changes

### New Pages:
1. **`/src/pages/Login.tsx`** - Login form with username/password
2. **`/src/pages/ChangePassword.tsx`** - Change password page

### Updated Pages:
- Modified routing to redirect unauthenticated users to login page
- Added logout functionality to dashboards

## Migration Steps

### 1. **Database Migration**
Run the Drizzle migration to add new fields:
```bash
pnpm drizzle-kit push
```

### 2. **Seed Initial Data**
Run the seed script to create owner account:
```bash
pnpm tsx server/seed.ts
```

### 3. **Create Marketer Credentials** (Admin)
Use the admin dashboard to create marketer credentials:
```typescript
await trpc.auth.createUserCredentials.mutate({
  entityId: "marketer_id",
  entityType: "marketer",
  username: "marketer_username",
  password: "secure_password_123"
});
```

### 4. **Create Cafeteria Credentials** (Marketer)
Marketers can create cafeteria credentials:
```typescript
await trpc.auth.createUserCredentials.mutate({
  entityId: "cafeteria_id",
  entityType: "cafeteria",
  username: "cafeteria_username",
  password: "secure_password_123"
});
```

### 5. **Create Staff Credentials** (Cafeteria Admin)
Cafeteria admins can create staff credentials:
```typescript
await trpc.auth.createUserCredentials.mutate({
  entityId: "staff_id",
  entityType: "staff",
  username: "staff_username",
  password: "secure_password_123"
});
```

## Security Considerations

1. **Password Hashing:** All passwords are hashed with bcryptjs (10 rounds)
2. **No Plain Text Storage:** Passwords are never stored in plain text
3. **Session Management:** Sessions are managed via JWT tokens in secure cookies
4. **Hierarchical Access:** Only authorized parents can create child accounts
5. **Unique Usernames:** Duplicate usernames are prevented at database level

## Removed Features

- ❌ OAuth/Manus authentication
- ❌ Public sign-up functionality
- ❌ Google/GitHub login
- ❌ OAuth callback routes

## File Changes

### New Files:
- `server/routers/auth.ts` - Authentication router with login/password change
- `server/seed.ts` - Database seed script
- `client/src/pages/Login.tsx` - Login page
- `client/src/pages/ChangePassword.tsx` - Change password page

### Modified Files:
- `drizzle/schema.ts` - Added password fields to 4 tables
- `server/routers.ts` - Integrated new auth router
- `package.json` - Added bcryptjs dependency

## Testing

### Test Login:
```bash
# Use these credentials to test
Username: yaserras@gmail.com
Password: Kamel123321$
```

### Test Password Change:
1. Login with owner credentials
2. Navigate to change password page
3. Enter old password and new password
4. Verify you can login with new password

## Troubleshooting

### "Invalid username or password"
- Check username spelling (case-sensitive)
- Verify password is correct
- Ensure account exists in database

### "Username already exists"
- Choose a different username
- Usernames must be unique across all entity types

### "Password must be at least 8 characters"
- Ensure new password is at least 8 characters long
- Include mix of uppercase, lowercase, numbers, and symbols for security

## Future Enhancements

- [ ] Add password reset via email
- [ ] Add two-factor authentication (2FA)
- [ ] Add account lockout after failed login attempts
- [ ] Add password expiration policy
- [ ] Add login audit logs
- [ ] Add session management dashboard
