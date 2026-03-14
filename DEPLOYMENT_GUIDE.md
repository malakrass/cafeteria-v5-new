# CAFETERIA V2 - Deployment Guide

## Overview

This guide provides instructions for setting up and deploying the CAFETERIA V2 system. It covers local development setup, environment variable configuration, Supabase integration for the database, and deployment to Vercel.

## 1. Local Development Setup

To run CAFETERIA V2 locally, follow these steps:

### 1.1. Prerequisites

Ensure you have the following installed:

-   Node.js (v18 or later)
-   npm or pnpm (pnpm is recommended)
-   Git
-   Docker (for local database setup, optional but recommended)

### 1.2. Clone the Repository

```bash
git clone <repository-url>
cd cafeteria-v2
```

### 1.3. Install Dependencies

```bash
pnpm install
```

### 1.4. Environment Variables

Create a `.env` file in the root directory of the project based on `.env.example`. You will need to configure the following variables:

```env
# Database Configuration (for local development)
DATABASE_URL="mysql://user:password@localhost:3306/cafeteria_v2"

# Authentication
AUTH_SECRET="your_auth_secret_key"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# S3 Storage (for image uploads)
AWS_ACCESS_KEY_ID="your_aws_access_key_id"
AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key"
AWS_REGION="your_aws_region"
AWS_S3_BUCKET_NAME="your_s3_bucket_name"

# Other Services (if applicable)
OPENAI_API_KEY="your_openai_api_key"
# ... other service keys
```

### 1.5. Local Database Setup (using Docker)

For local development, you can use Docker to run a MySQL instance.

1.  **Start MySQL Container:**

    ```bash
docker run --name cafeteria-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=cafeteria_v2 -p 3306:3306 -d mysql:8
    ```

2.  **Run Drizzle Migrations:**

    ```bash
pnpm drizzle-kit push:mysql
    ```

    This will apply the database schema defined in `drizzle/schema.ts` to your local MySQL instance.

### 1.6. Start Development Servers

```bash
pnpm dev
```

This will start both the frontend (Vite) and backend (tRPC) development servers. The application will typically be accessible at `http://localhost:3000`.

## 2. Supabase Setup (Production Database)

For production deployments, Supabase provides a managed PostgreSQL database. While the current Drizzle schema is for MySQL, it can be adapted for PostgreSQL with minor adjustments.

1.  **Create a Supabase Project:**
    -   Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Get Database Credentials:**
    -   Navigate to `Project Settings > Database` to find your connection string.
3.  **Update `DATABASE_URL`:**
    -   Modify your `DATABASE_URL` in the `.env` file to use the Supabase connection string. Ensure you use the `pg` protocol if using PostgreSQL.
    ```env
    DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST].supabase.co:5432/postgres"
    ```
4.  **Run Drizzle Migrations (for Supabase):**
    -   You might need to adjust Drizzle configuration (`drizzle.config.ts`) to point to PostgreSQL and then run migrations.
    ```bash
    # Example: if using PostgreSQL
    # pnpm drizzle-kit push:pg
    ```

## 3. Vercel Deployment

CAFETERIA V2 is designed for easy deployment to Vercel, a platform for frontend frameworks and static sites.

### 3.1. Prerequisites

-   A Vercel account.
-   Vercel CLI installed and logged in (`npm i -g vercel && vercel login`).

### 3.2. Link Your Project

```bash
vercel link
```

Follow the prompts to link your local project to a new or existing Vercel project.

### 3.3. Configure Environment Variables on Vercel

It is crucial to set all production environment variables (from your `.env` file) directly in your Vercel project settings:

1.  Go to your Vercel project dashboard.
2.  Navigate to `Settings > Environment Variables`.
3.  Add all necessary variables (e.g., `DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`). Ensure they are configured for the `Production`, `Preview`, and `Development` environments as needed.

### 3.4. Deploy to Vercel

```bash
vercel deploy
```

This command will build and deploy your project. Vercel automatically detects the framework and configures the build process. You can also deploy by pushing changes to your Git repository if integrated with Vercel.

## 4. Post-Deployment Steps

-   **Database Seeding:** For a fresh deployment, you might need to run a seeding script to populate initial data (e.g., admin users, initial menu items, cafeteria configurations).
-   **Domain Configuration:** Configure your custom domain in Vercel settings.
-   **Monitoring:** Set up monitoring and logging for your deployed application to track performance and errors.
