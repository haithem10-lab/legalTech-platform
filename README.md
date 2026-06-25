# LegalTech — Embeddable Legal Intake Platform

A Stripe-like embeddable form platform for law firms. Build intake forms once, embed them anywhere with a single `<script>` tag, receive signed and verified submissions instantly.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Project Structure](#project-structure)
3. [Security Protocol — HMAC Webhook Signing](#security-protocol--hmac-webhook-signing)
4. [Embed Script — How Config is Fetched on Client Load](#embed-script--how-config-is-fetched-on-client-load)
5. [API Reference](#api-reference)

---

## Local Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Firebase project | Admin SDK enabled |

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

Enable **Firestore** in the Firebase console (Native mode).

---

### Step 3 — Environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

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
OPENAI_API_KEY=sk-...
```

> **Note:** `FIREBASE_PRIVATE_KEY` must include the literal `\n` newline sequences exactly as they appear in the downloaded JSON.

---

### Step 4 — Seed a user account

The platform uses NextAuth with a credentials provider. Create a user directly in Firestore:

**Collection:** `accounts`

```json
{
  "email": "lawyer@example.com",
  "passwordHash": "<bcrypt hash>",
  "createdAt": "<timestamp>"
}
```

You can generate a bcrypt hash with:

```bash
node -e "const b=require('bcryptjs');b.hash('yourpassword',10).then(console.log)"
```

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
| `npm run lint` | ESLint check |

---

## Project Structure

```
src/
├── app/
│   ├── admin/                    # Admin UI (builder, submissions)
│   │   └── workflows/
│   │       ├── page.tsx          # Workflows list
│   │       ├── [id]/build/       # Form builder
│   │       └── [id]/submissions/ # Submission viewer
│   ├── api/
│   │   ├── admin/                # Session-gated admin APIs
│   │   │   ├── workflows/        # CRUD for workflows
│   │   │   ├── ai/               # AI layout generator
│   │   │   └── files/            # Signed download URLs
│   │   └── public/               # Unauthenticated public APIs
│   │       ├── config/[id]/      # Returns public form schema
│   │       ├── submit/[id]/      # Accepts form submissions
│   │       └── upload/           # File upload endpoint
│   └── login/                    # Auth page
├── components/
│   └── AdminNav.tsx              # Top navigation bar
├── contexts/
│   └── WorkflowNameContext.tsx   # Shares active workflow name to nav
├── embed/
│   └── embed.ts                  # Embed script source (compiled to public/embed.js)
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── cors.ts                   # CORS helpers
│   ├── firebase.ts               # Firebase Admin init
│   ├── firestore.ts              # Firestore data access layer
│   ├── origin.ts                 # Origin allow-list check
│   ├── projection.ts             # Strips secrets before public response
│   ├── renderer.ts               # DOM form renderer (shared by embed + preview)
│   └── storage.ts                # GCS client (for legacy signed URLs)
├── types/
│   └── workflow.ts               # TypeScript types: Field, Theme, Workflow, Submission
public/
├── embed.js                      # Compiled embed bundle (committed)
└── uploads/                      # Local file uploads (dev only)
```

---

## Security Protocol — HMAC Webhook Signing

Every time a form is submitted, the platform delivers the data to the law firm's configured webhook URL. To let your server verify that the request genuinely came from this platform and was not tampered with in transit, every outgoing webhook is signed using **HMAC-SHA256**.

### How signing works

**1. Payload construction**

The raw JSON string sent in the `POST` body is:

```json
{
  "workflowId": "abc123",
  "submissionId": "xyz789",
  "data": { "field-1": "John Smith", "field-2": "john@example.com" },
  "submittedAt": "2026-06-25T14:32:00.000Z",
  "originHost": "https://lawfirm.com"
}
```

**2. Signature generation**

```ts
import { createHmac } from "crypto";

const sig = createHmac("sha256", workflow.hmacSecret)
  .update(webhookPayload)   // the raw JSON string, not the parsed object
  .digest("hex");
```

The `hmacSecret` is a unique secret generated per workflow and stored in Firestore. It is **never** returned to the public config endpoint — only the server holds it.

**3. Delivery**

The signature is sent as the `X-Signature` header alongside the payload:

```
POST https://yourserver.com/webhook
Content-Type: application/json
X-Signature: a3f1e8c2d4...   (64 hex chars)
X-Workflow-Id: abc123
```

### Verifying on your server

```js
import { createHmac, timingSafeEqual } from "crypto";

function verifyWebhook(rawBody, receivedSig, secret) {
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(receivedSig, "hex")
  );
}

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["x-signature"];
  if (!verifyWebhook(req.body, sig, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }
  const payload = JSON.parse(req.body.toString());
  // process payload...
  res.sendStatus(200);
});
```

> **Important:** Always use `timingSafeEqual` instead of `===` to compare signatures. String equality short-circuits on the first differing character, which leaks timing information that an attacker can exploit to forge signatures.

### Finding your secret

In the builder, click **Embed code → Security setup**. The signing secret is shown masked. Click the eye icon to reveal it, or **Regenerate** to rotate it (this will break existing receivers until they update).

### Origin allow-list

Before accepting any public API request, the server checks the `Origin` header against the workflow's `allowedOrigins` list:

```ts
// src/lib/origin.ts
export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return process.env.NODE_ENV === "development";
  if (allowedOrigins.length === 0) return false; // deny-by-default
  return allowedOrigins.includes(origin.replace(/\/$/, ""));
}
```

- **Empty list → deny everything.** A newly created workflow rejects all embeds until you explicitly add an origin.
- **Null origin** (e.g. `file://`, sandboxed iframe) is allowed only in local development.
- Trailing slashes are normalised before comparison.

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

The script tag is loaded asynchronously so it never blocks page rendering. The `data-workflow-id` attribute tells the script which form to load.

### Step-by-step client load sequence

```
Host page loads
     │
     ▼
embed.js executes (IIFE)
     │
     ├─ 1. Locate own <script> tag via querySelectorAll('[data-workflow-id]')
     │       Reads workflowId and derives appOrigin from script.src URL
     │
     ├─ 2. Insert a <div data-legalform="..."> mount point
     │       Inserted immediately after the script tag in the DOM
     │       Shows "Loading form…" placeholder
     │
     ├─ 3. GET /api/public/config/{workflowId}?t={Date.now()}
     │       Cache-busting query param + Cache-Control: no-store headers
     │       origin header is sent automatically by the browser
     │
     │       Server checks:
     │         • Workflow exists and is published
     │         • Origin is in allowedOrigins list
     │         • Strips hmacSecret and accountId (publicProjection)
     │
     ├─ 4. On 403 → "This form is not available on this domain."
     │     On 404 → "Form not found or unavailable."
     │     On error → generic error message
     │
     ├─ 5. On 200 → renderForm(wrapper, schema, theme, name)
     │       Builds the entire form in DOM (no framework, no shadow DOM)
     │       CSS isolation via `all: initial` wrapper style
     │       Renders fields in order: text, email, dropdown, radio, file, dynamic-list
     │       Applies theme: bgColor, font, radius, density, buttonColor, buttonSize
     │
     ├─ 6. File fields upload immediately on selection
     │       POST /api/public/upload (multipart/form-data)
     │       Server validates type + size, saves to /public/uploads/
     │       Returns { filePath: "/uploads/uuid.ext" }
     │       filePath stored on fieldEl.dataset.filePath for submit collection
     │
     └─ 7. Form submit intercepted (preventDefault)
             Collects field values by iterating schema + [data-field-id] markers
             POST /api/public/submit/{workflowId} with { data: {...} }
             Server validates with Zod, writes to Firestore, fires webhook
             On success → replaces form with "Thank you" confirmation
             On 400 with field errors → inline error messages per field
```

### Cache-busting strategy

The config endpoint is fetched with three layers of cache prevention:

```ts
fetch(`${appOrigin}/api/public/config/${workflowId}?t=${Date.now()}`, {
  method: "GET",
  cache: "no-store",
  credentials: "omit",
})
```

| Layer | Mechanism |
|-------|-----------|
| URL | `?t={timestamp}` makes every request a unique URL |
| Fetch API | `cache: "no-store"` bypasses the browser's HTTP cache |
| Server | `Cache-Control: no-store, no-cache, must-revalidate, private` prevents CDN/proxy caching |

This ensures that when a lawyer updates their form and saves, the next page load on the embedded site always fetches the latest schema.

### CSS isolation

The rendered form is wrapped in a `div` with `all: initial` to prevent host-page stylesheets from leaking into the form:

```ts
wrapper.style.cssText = `
  all: initial;
  display: block;
  font-family: ${workflow.theme.font}, system-ui, sans-serif;
  box-sizing: border-box;
`;
```

All element styles are applied inline, making the form render consistently regardless of the host site's CSS framework.

---

## API Reference

### Public (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/public/config/:workflowId` | Returns public form schema + theme. Requires valid origin. |
| `POST` | `/api/public/submit/:workflowId` | Accepts form submission. Fires webhook. |
| `POST` | `/api/public/upload` | Uploads a file (multipart/form-data). Returns `{ filePath }`. |

### Admin (session required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/workflows` | List all workflows for the authenticated account. |
| `POST` | `/api/admin/workflows` | Create a new workflow. |
| `GET` | `/api/admin/workflows/:id` | Get a single workflow (includes hmacSecret). |
| `PATCH` | `/api/admin/workflows/:id` | Update schema, theme, name, status, webhook, origins. |
| `POST` | `/api/admin/ai/generate-layout` | Generate schema + theme from a natural language prompt (GPT-4o). |
| `GET` | `/api/admin/files/download?path=` | Generate a signed read URL for a GCS-stored file. |
