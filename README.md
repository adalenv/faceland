# Faceland - Lead Form Builder

A personal Facebook Lead Form style form builder application built with Next.js 14, TypeScript, TailwindCSS, and PostgreSQL.

## Features

- **Form Builder**: Drag-and-drop question reordering with dnd-kit
- **Question Types**: Short text, long text, single choice, multiple choice, email, phone, consent
- **Public Forms**: Card-by-card Facebook-style form experience with progress indicator
- **Lead Management**: View, search, and export leads as CSV
- **Webhook Integration**: Send lead data to external services with HMAC-SHA256 signing
- **Export Options**: Iframe embed code and standalone HTML file export
- **Simple Auth**: Password-based admin authentication (no external providers)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- PostgreSQL + Prisma
- shadcn/ui components
- dnd-kit for drag & drop
- Zod for validation

## Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- npm or yarn

## Quick Start with Docker

The easiest way to run Faceland is with Docker. Database data is persisted in the `./data/postgres` folder.

```bash
# Start everything (app + database)
docker-compose up -d

# Run database migrations (first time only)
docker-compose run --rm migrate

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down
```

The app will be available at **http://localhost:3000**

Default credentials:
- Password: `admin123`

### Environment Variables (Docker)

You can customize the app by setting environment variables in `docker-compose.yml` or creating a `.env` file:

```env
ADMIN_PASSWORD=your-secure-password
SESSION_SECRET=your-session-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Data Persistence

PostgreSQL data is stored in `./data/postgres/`. This folder is automatically created and persisted between container restarts.

To backup your data:
```bash
# Stop the database first
docker-compose stop db

# Copy the data folder
cp -r ./data/postgres ./backup/postgres-$(date +%Y%m%d)

# Restart
docker-compose start db
```

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd faceland
npm install
```

### 2. Start Database (using Docker)

```bash
# Start only the PostgreSQL database
docker-compose -f docker-compose.dev.yml up -d
```

Or use your own PostgreSQL instance.

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database (port 5433 to avoid conflicts)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/faceland?schema=public"

# Admin Authentication
ADMIN_PASSWORD="your-secure-password-here"

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET="your-session-secret-here"

# App URL (used for webhook callbacks and export)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Production Build

```bash
npm run build
npm start
```

## Usage

### Admin Panel

1. Navigate to `/admin/login`
2. Enter the password from your `ADMIN_PASSWORD` environment variable
3. Create forms, add questions, and publish

### Public Forms

Published forms are accessible at `/f/[slug]`

### Webhook Integration

When a lead is submitted, the webhook payload looks like:

```json
{
  "event": "lead.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "formId": "clr...",
  "formSlug": "contact-form",
  "formName": "Contact Form",
  "submissionId": "clr...",
  "answers": {
    "email": {
      "questionKey": "email",
      "questionLabel": "Email Address",
      "questionType": "email",
      "value": "user@example.com"
    }
  },
  "meta": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://example.com",
    "utm": {
      "source": "google",
      "medium": "cpc",
      "campaign": "spring-sale"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Webhook Signature Verification

If you set a webhook secret, requests are signed with HMAC-SHA256. The signature is sent in the `X-Signature` header.

**Node.js verification example:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = req.body.toString();
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const data = JSON.parse(payload);
  // Process the webhook...
  
  res.status(200).send('OK');
});
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/public/submit` | Submit form answers (public) |
| POST | `/api/admin/webhook/test` | Send test webhook |
| GET | `/api/admin/forms/[id]/export/html` | Download standalone HTML |
| GET | `/api/admin/forms/[id]/export/csv` | Download leads CSV |

## Database Schema

- **Form**: Form configuration and settings
- **FormVersion**: Published snapshots of forms
- **Question**: Form questions with type and configuration
- **Submission**: Lead submissions with metadata
- **Answer**: Individual answers for each submission
- **WebhookDelivery**: Webhook delivery queue and logs

## Project Structure

```
├── app/
│   ├── admin/           # Admin pages
│   │   ├── forms/       # Form management
│   │   └── login/       # Authentication
│   ├── api/             # API routes
│   │   ├── admin/       # Admin APIs
│   │   └── public/      # Public APIs
│   └── f/[slug]/        # Public form pages
├── components/
│   ├── admin/           # Admin components
│   ├── public/          # Public form components
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── auth.ts          # Authentication utilities
│   ├── db.ts            # Prisma client
│   ├── validations.ts   # Zod schemas
│   ├── webhook.ts       # Webhook utilities
│   └── utils.ts         # Helper functions
└── prisma/
    └── schema.prisma    # Database schema
```

## License

MIT

# faceland
