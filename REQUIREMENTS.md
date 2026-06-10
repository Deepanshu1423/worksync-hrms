# WorkSync HRMS Requirements

This project is a Node.js/TypeScript monorepo with two main apps:

- `apps/api` - Express.js API with Prisma and PostgreSQL
- `apps/web` - Next.js frontend

There is no Python `requirements.txt` file because this project uses `package.json` and `package-lock.json` for dependencies.

## Required Software

- Node.js 20 or newer
- npm
- PostgreSQL database
- Cloudinary account for attendance/file image uploads
- Git

## Install Dependencies

Run from the project root:

```bash
npm install
```

This installs dependencies for the root workspace, API app, and web app.

## Environment Variables

Create or update `apps/api/.env` with these values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_ACCESS_SECRET="your_jwt_secret"
CLIENT_URL="http://localhost:9000"
PORT=5000
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
```

Do not commit real secret values to Git.

## Database Setup

Run from the project root:

```bash
npm run prisma:generate --workspace=apps/api
npm run prisma:migrate --workspace=apps/api
npm run seed --workspace=apps/api
```

## Development Commands

Start the API:

```bash
npm run dev:api
```

Start the web app:

```bash
npm run dev:web
```

Default local URLs:

- Web: `http://localhost:9000`
- API: `http://localhost:5000`

## Build Commands

Build the API:

```bash
npm run build:api
```

Build the web app:

```bash
npm run build:web
```

## Main Dependency Files

- Root workspace dependencies: `package.json`
- API dependencies: `apps/api/package.json`
- Web dependencies: `apps/web/package.json`
- Locked dependency versions: `package-lock.json`

