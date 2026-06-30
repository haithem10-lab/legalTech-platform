# LegalTech — Embeddable Legal Intake Platform

A multi-tenant embeddable form platform for law firms. Build intake forms once, embed them anywhere with a single `<script>` tag, receive signed and verified submissions instantly.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Project Structure](#project-structure)
3. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
4. [Security Protocol — HMAC Webhook Signing](#security-protocol--hmac-webhook-signing)
5. [Embed Script — How Config is Fetched on Client Load](#embed-script--how-config-is-fetched-on-client-load)
6. [API Reference](#api-reference)

---

## Local Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Firebase project | Auth + Firestore enabled |

---

### Step 1 — Clone and install dependencies

```bash
git clone <repo-url>
cd legal-platform
npm install
```

---

### Step 2 — Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings → Service accounts**
2. Click **Generate new private key** — download the JSON file
3. From the JSON, copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

Enable **Firestore** (Native mode) and **Firebase Authentication** (Email/Password provider) in the Firebase console.

---

### Step 3 — Environment variables

Create `.env.local` at the project root:

```env
# NextAuth — generate secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Public URL used inside the embed script
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Admin SDK credentials (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenAI — for the AI Layout Generator (optional)
OPENAI_API_KEY=
```

> **Note:** `FIREBASE_PRIVATE_KEY` must include the literal `\n` newline sequences exactly as they appear in the downloaded JSON.

---

### Step 4 — Create your first account

The platform uses a self-service signup flow. No manual seeding required.

1. Start the dev server: `npm run dev`
2. Open [http://localhost:3000/signup](http://localhost:3000/signup)
3. Sign up with a **work email** (personal addresses like Gmail are blocked)
4. The first person from a domain becomes the **admin** of a new organization
5. Subsequent signups from the same domain go through an admin approval step

---

### Step 5 — Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

### Step 6 — Build the embed bundle

The embed script (`public/embed.js`) is built separately with esbuild. Run this after any changes to `src/embed/embed.ts` or `src/lib/renderer.ts`:

```bash
npm run build:embed
```

The output is written to `public/embed.js` and served as a static file.

---

### Step 7 — Test an embedded form locally

A test site is included at `test-site/index.html`. Serve it on a different port to simulate cross-origin embedding:

```bash
npx serve test-site -p 8090
```

Then open [http://localhost:8090](http://localhost:8090). The form fetches its config from `localhost:3000` and renders inside the host page.

> The workflow must be set to **Live** and `http://localhost:8090` must be added to its **Allowed Origins** list in the builder.

---

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run build:embed` | Bundle `embed.ts` → `public/embed.js` |

---

## Project Structure

```
src/
├── app/
│   ├── admin/                        # Admin portal (session-gated)
│   │   ├── layout.tsx                # Shared nav + pending-member count
│   │   ├── workflows/
│   │   │   ├── page.tsx              # Workflows list
│   │   │   ├── new/                  # Create workflow
│   │   │   └── [id]/
│   │   │       ├── build/            # Form builder (fields, theme, preview)
│   │   │       └── submissions/      # Submission viewer + detail
│   │   └── settings/
│   │       └── team/                 # Team management (admin only)
│   ├── api/
│   │   ├── auth/                     # Authentication routes
│   │   │   ├── signup/               # Register + create/join organization
│   │   │   ├── check-domain/         # Check if domain has existing org
│   │   │   ├── forgot-password/      # Send password reset email
│   │   │   └── reset-password/       # Apply new password via oobCode
│   │   ├── admin/                    # Session-gated admin APIs
│   │   │   ├── workflows/            # CRUD for workflows
│   │   │   ├── team/                 # Approve / reject / block members
│   │   │   ├── ai/                   # AI layout generator (GPT-4o)
│   │   │   └── files/                # Signed download URLs
│   │   └── public/                   # Unauthenticated public APIs
│   │       ├── config/[id]/          # Returns public form schema
│   │       ├── submit/[id]/          # Accepts form submissions
│   │       └── upload/               # File upload endpoint
│   ├── login/                        # Sign-in page
│   ├── signup/                       # Registration page (2-step)
│   ├── forgot-password/              # Request password reset
│   ├── reset-password/               # Set new password
│   └── pending/                      # Waiting-for-approval screen
├── components/
│   ├── AdminNav.tsx                  # Top navigation bar
│   └── builder/                      # Builder sub-components
│       ├── FieldList.tsx             # Left panel — field list + AI generator
│       ├── FieldRow.tsx              # Individual draggable field row + config
│       ├── ThemePanel.tsx            # Right panel — theme controls
│       ├── PreviewPane.tsx           # Centre — live form preview
│       ├── EmbedModal.tsx            # Embed code + security setup modal
│       └── shared.tsx                # StatusPill, Seg, Eyebrow components
├── contexts/
│   └── WorkflowNameContext.tsx       # Shares active workflow name to nav
├── embed/
│   └── embed.ts                      # Embed script source (compiled → public/embed.js)
├── lib/
│   ├── auth.ts                       # NextAuth config + JWT/session callbacks
│   ├── blocked-domains.ts            # Personal email domain blocklist
│   ├── db/                           # Firestore data access layer
│   │   ├── index.ts                  # Re-exports all db functions
│   │   ├── workflows.ts              # Workflow CRUD
│   │   ├── submissions.ts            # Submission read/write
│   │   └── utils.ts                  # Shared collection names + mappers
│   ├── email.ts                      # Email sender (logs to console in dev)
│   ├── env.ts                        # Validated environment variables
│   ├── firebase.ts                   # Firebase Admin SDK init
│   ├── guards/
│   │   └── publicRoute.ts            # Shared auth guard for public API routes
│   ├── api/
│   │   └── responses.ts              # Shared response helpers (jsonError, corsHeaders)
│   ├── origin.ts                     # Origin allow-list check
│   ├── projection.ts                 # Strips secrets before public response
│   ├── ratelimit.ts                  # In-memory rate limiter
│   ├── renderer.ts                   # DOM form renderer (shared by embed + preview)
│   └── storage.ts                    # GCS client (file download signing)
├── types/
│   ├── workflow.ts                   # Field, Theme, Workflow, Submission types
│   └── next-auth.d.ts                # Augmented session types (orgId, role, status)
public/
├── embed.js                          # Compiled embed bundle (committed)
└── uploads/                          # Local file uploads (dev only, git-ignored)
```

---

## Authentication & Multi-Tenancy

### Organization model

Every user belongs to exactly one **organization** (a law firm). Organizations are identified by email domain — everyone with `@smithlaw.com` belongs to the same org.

| Role | Permissions |
|------|------------|
| `admin` | Full access: build forms, view submissions, manage team, access settings |
| `lawyer` | View workflows and submissions within their org |

### Signup flow

1. **Step 1 — Personal info**: name, work email, password
   - Personal email domains (Gmail, Yahoo, etc.) are rejected
   - Domain is checked against existing organizations
2. **Step 2 — Firm info**:
   - **Scenario A** — First from domain: enter firm name → become admin, access granted immediately
   - **Scenario B** — Org already exists: request sent to admin for approval, user lands on `/pending`

### Member states

| Status | Meaning |
|--------|---------|
| `active` | Can log in and access the platform |
| `pending_approval` | Signed up, waiting for admin to approve |
| `blocked` | Explicitly blocked by admin — cannot log in |

### Password reset

Initiated via `/forgot-password`. An email is sent with a one-time link to `/reset-password?oobCode=...`. In development the email is printed to the terminal instead of being sent.

---

## Security Protocol — HMAC Webhook Signing

Every form submission fires a signed `POST` to the workflow's configured webhook URL.

### Payload

```json
{
  "workflowId": "abc123",
  "submissionId": "xyz789",
  "data": { "field-1": "John Smith", "field-2": "john@example.com" },
  "submittedAt": "2026-06-25T14:32:00.000Z",
  "originHost": "https://lawfirm.com"
}
```

### Signature generation

```ts
import { createHmac } from "crypto";

const sig = createHmac("sha256", workflow.hmacSecret)
  .update(webhookPayload)   // raw JSON string
  .digest("hex");
```

The signature is delivered as the `X-Signature` header (64 hex chars). The `hmacSecret` is per-workflow, stored in Firestore, and never returned by the public config endpoint.

> **Always** verify with `timingSafeEqual` — never `===`. String equality short-circuits and leaks timing information.

### Finding your secret

In the builder → **Embed code → Security setup**. The secret is masked by default. Click the eye icon to reveal or **Regenerate** to rotate it.

### Origin allow-list

Before accepting any public API request, the server checks the `Origin` header against `allowedOrigins`:

- **Empty list → deny everything.** Add at least one origin before going live.
- Trailing slashes are normalised before comparison.

### Rate limiting

All sensitive endpoints are rate-limited per IP (and per email for auth endpoints):

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/signup` | 3 requests / 15 min per IP |
| `POST /api/auth/forgot-password` | 3 requests / 15 min per IP + 3 / 15 min per email |
| `GET /api/public/config/:id` | 30 requests / min per IP |
| `POST /api/public/submit/:id` | 5 requests / min per IP |
| `POST /api/public/upload` | 10 requests / min per IP |

> The rate limiter is in-process (no Redis). On multi-instance deployments (Vercel) each instance has its own counter. For production use, replace `src/lib/ratelimit.ts` with a shared store (Upstash Redis / Vercel KV).

---

## Embed Script — How Config is Fetched on Client Load

The embed system is a single self-contained IIFE bundle (`public/embed.js`) built from `src/embed/embed.ts` using esbuild. It shares the form renderer (`src/lib/renderer.ts`) with the admin preview — the same DOM construction code runs both in the builder and in the end-user's browser.

### Embedding

```html
<script
  src="https://yourapp.com/embed.js"
  data-workflow-id="abc123"
  async
></script>
```

### Load sequence

```
Host page loads
     │
     ▼
embed.js executes (IIFE)
     │
     ├─ 1. Locate own <script> tag via querySelectorAll('[data-workflow-id]')
     │       Reads workflowId, derives appOrigin from script.src
     │
     ├─ 2. Insert <div data-legalform="..."> mount point after the script tag
     │       Shows "Loading form…" placeholder
     │
     ├─ 3. GET /api/public/config/{workflowId}
     │       Server checks: workflow exists + published, origin allowed
     │       Response strips hmacSecret (publicProjection)
     │
     ├─ 4. On 403 → "This form is not available on this domain."
     │     On 404 → "Form not found or unavailable."
     │
     ├─ 5. On 200 → renderForm(wrapper, schema, theme, name)
     │       Builds entire form in DOM (no framework, no shadow DOM)
     │       Applies theme: bgColor, font, radius, density, buttonColor
     │       Text colors auto-adapt for dark backgrounds (Slate mode)
     │
     ├─ 6. File fields: upload on selection
     │       POST /api/public/upload (multipart/form-data)
     │       Returns { filePath } stored on field dataset for submit
     │
     └─ 7. Submit intercepted (preventDefault)
             POST /api/public/submit/{workflowId} → Zod validation → Firestore
             On success → "Thank you" confirmation
             On 400 → inline field errors
```

### CSS isolation

All element styles are applied inline. The mount wrapper uses `all: initial` to prevent host-page CSS from leaking into the form.

---

## API Reference

### Public (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/public/config/:workflowId` | Returns public form schema + theme. Requires valid origin. |
| `POST` | `/api/public/submit/:workflowId` | Accepts form submission. Fires webhook. |
| `POST` | `/api/public/upload` | Uploads a file (multipart). Returns `{ filePath }`. |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Register user + create or join organization. |
| `GET` | `/api/auth/check-domain?domain=` | Check if domain has an existing organization. |
| `POST` | `/api/auth/forgot-password` | Send password reset email. |
| `POST` | `/api/auth/reset-password` | Apply new password using Firebase oobCode. |

### Admin (session required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/workflows` | List all workflows for the authenticated org. |
| `POST` | `/api/admin/workflows` | Create a new workflow. |
| `GET` | `/api/admin/workflows/:id` | Get a single workflow (includes hmacSecret). |
| `PATCH` | `/api/admin/workflows/:id` | Update schema, theme, name, status, webhook, origins. |
| `POST` | `/api/admin/team/approve` | Approve, reject, block, or unblock a team member (admin only). |
| `POST` | `/api/admin/ai/generate-layout` | Generate schema + theme from a natural language prompt (GPT-4o). |
| `GET` | `/api/admin/files/download?path=` | Generate a signed read URL for a stored file. |
