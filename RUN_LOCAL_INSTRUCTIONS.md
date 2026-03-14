# Run Local Instructions - CAFETERIA V2

Follow these steps to run the stabilized project in a local environment.

## 1. Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later (or `pnpm`)
- **Database**: A MySQL/TiDB compatible database

## 2. Installation
Extract the stable ZIP and install dependencies:
```bash
npm install --legacy-peer-deps
```

## 3. Configuration
Create a `.env` file in the root directory and add your database connection:
```env
DATABASE_URL="mysql://user:password@host:port/database"
NODE_ENV="development"
```

## 4. Build
To compile the project (frontend and backend):
```bash
npm run build
```

## 5. Development Mode
To start the project in development mode (with hot-reload):
```bash
npm run dev
```

## 6. Production Mode
To start the project after building:
```bash
npm run start
```
