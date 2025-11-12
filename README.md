# ERNIt Back

An OCR-Powered Reimbursement Automation and Approval Monitoring System for ERNI Philippines

Capstone Project by:
- Carl Daniel S. Catungal
- Hasanor A. Dimasimpan
- Cathlene B. Ilagan-Lagumen
- Yolando S. Son III

---

## Project Overview

ERNIt Back automates ERNI Philippines' manual email-based reimbursement workflow. It uses OCR (Google Gemini 2.0 Flash) to extract key data from receipts (merchant name, date, total), auto-fills reimbursement forms, enforces role-based approval flows, and provides tracking and email notifications to improve accuracy, transparency, and processing speed.

Primary goals:
- Reduce manual data entry and errors via OCR-assisted receipt parsing.
- Enforce ERNI's hierarchical approval workflow.
- Provide real-time status monitoring for submitters and approvers.
- Automate notifications for major state transitions (submitted, returned, approved, released).

## Key Features

- Smart receipt upload with Gemini OCR extraction (merchant, date, total).
- Role-based approval workflows:
  - Employee → SUL → AM → Invoice Specialist → Finance Officer
  - SUL → Sales Director → Invoice Specialist → Finance Officer
  - AM → Sales Director → Invoice Specialist → Finance Officer
  - Invoice Specialist → Sales Director → Invoice Specialist → Finance Officer
- Reimbursement dashboard and status tracking.
- Email notifications (Nodemailer for local/Dev with Google SMTP; SendGrid for deployed).
- Azure AD (Microsoft OAuth 2.0) for authentication.
- PostgreSQL (hosted via Supabase) as primary data store.
- Audit logs for approvals, returns, and status changes.

## Tech Stack

- Frontend: React + Material-UI
- Backend: Node.js + Express.js
- Database: PostgreSQL (Supabase)
- Authentication: Microsoft OAuth 2.0 (Azure AD)
- AI / OCR: Google Gemini 2.0 Flash
- Email: Nodemailer (Google SMTP for local/dev), SendGrid (production)

## Repository Layout (expected)

Note: Folder names may vary slightly in the repository — this is the conceptual layout.

- /client — React frontend (Material-UI)
- /server — Node/Express API
- /migrations — DB migration scripts
- /docs — project documentation
- /scripts — helper and deployment scripts

## Getting Started (Local Development)

These are generic steps — adjust commands to match repo scripts.

1. Clone the repo
```bash
git clone https://github.com/cdCatungal/reimbursement-capstone.git
cd reimbursement-capstone
```

2. Install dependencies
- Frontend
```bash
cd client
npm install
```
- Backend
```bash
cd ../server
npm install
```

3. Configure environment variables

Create a `.env` file in `server/` (and `client/` if needed) with placeholders similar to the example below.

Example server `.env` variables:
```
# Server / App
NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:4000
CLIENT_BASE_URL=http://localhost:3000

# Supabase / Postgres
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://user:pass@host:port/dbname   # optional if using direct Postgres

# Azure AD (Microsoft OAuth 2.0)
AZURE_CLIENT_ID=your-azure-ad-client-id
AZURE_CLIENT_SECRET=your-azure-ad-client-secret
AZURE_TENANT_ID=your-tenant-id
OAUTH_CALLBACK_URL=http://localhost:4000/auth/azure/callback

# Gemini OCR
GEMINI_API_KEY=your_gemini_api_key
OCR_PROVIDER=gemini

# Email (development - Google SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=your_google_smtp_app_password

# SendGrid (production)
SENDGRID_API_KEY=your_sendgrid_api_key

# Other
JWT_SECRET=your_jwt_secret
```

4. Initialize database
- If using Supabase: create a project and apply schema/migrations. Use Supabase dashboard or CLI.
- If using direct Postgres: run migration scripts (adjust commands to the project's migration tool — e.g., knex/Sequelize/TypeORM).

Example (generic):
```bash
# from server/
npm run migrate
npm run seed  # optional: seeds for test accounts/roles
```

5. Run the app
- Frontend
```bash
cd client
npm start
```
- Backend
```bash
cd ../server
npm run dev
```

Visit: http://localhost:3000 (frontend) and ensure API is available at the configured port (e.g., http://localhost:4000).

## Authentication (Azure AD)

1. Register an application in Azure Active Directory.
2. Add redirect/callback URL(s), e.g.:
   - http://localhost:4000/auth/azure/callback
3. Capture:
   - Application (client) ID
   - Client secret
   - Tenant ID
4. Configure these values into `.env` as shown above.
5. Backend implements the OAuth 2.0 flow and maps Azure AD users to application roles (Employee, SUL, AM, Invoice Specialist, Finance Officer). Ensure role assignment logic is in place or seed admin accounts.

## OCR / Gemini Integration

- The server sends uploaded receipt images to Google Gemini 2.0 Flash OCR endpoint.
- The OCR response should be parsed to extract:
  - Merchant / vendor name
  - Transaction date
  - Total amount
  - (Optional) TIN and address fields for BIR compliance checks
- Post-process OCR results with validation and fuzzy matching (OCR can be noisy).
- Ensure GAMMA / Gemini API key is stored securely and usage is rate-limited to manage costs.

## Email Notifications

- Development: Nodemailer with Google SMTP (use app-specific password if using Gmail).
- Production: SendGrid (recommended). Use transactional templates for consistent notifications.
- Notifications typically sent on:
  - Submission received
  - Approval granted
  - Returned for revision
  - Released for payment

## Approval Workflow & Business Rules

The app enforces different approval chains depending on submitter role. Business rules to consider:
- Required attachments and minimum fields for submission.
- Maximum reimbursement amounts or limits per category (if policy mandates).
- BIR compliance checks: receipts must contain company name, TIN, and address — provide flags for finance review.
- Reimbursement types (OT meal, client meal, transport, accommodation) to be supported and validated against policy.

## Deployment

- Use environment variables for all secrets (do not commit `.env`).
- Deploy frontend and backend to your chosen cloud provider (Vercel/Netlify for client, Heroku/GCP/Azure/AWS for server).
- Use SendGrid in production for reliable deliverability.
- Ensure HTTPS/TLS is enforced.
- Schedule backups and secure database access.

## Security & Data Privacy

- Protect API keys and service-role keys (use vaults or platform-managed secrets).
- Limit stored personal data to what’s necessary; follow ERNI's and local data protection rules.
- Use strong RBAC; ensure endpoints are protected and audited.
- Sanitize and validate OCR outputs and uploaded files; scan for malware where appropriate.

## Troubleshooting

- OCR returns incorrect data: add manual edit option before submit and log raw OCR output for debugging.
- Auth issues: verify redirect URIs and client secret validity in Azure AD.
- Email failures: check SMTP credentials and email provider limits; switch to SendGrid for production.

## Contributing

- Fork repo, create feature branch, add tests, open Pull Request.
- Follow the project's code style and write unit/integration tests for new features.

## License

Add a LICENSE file to specify terms. For academic projects, MIT is common unless stated otherwise.

## Acknowledgements

- ERNI Philippines — project sponsor / domain provider
- Google Gemini for OCR capabilities
- Azure AD for enterprise authentication
- Supabase for managed Postgres hosting

---

If you'd like, I can:
- Add a ready-to-commit `.env.example`.
- Draft a CONTRIBUTING.md and ISSUE/PR templates.
- Create a short Docker Compose setup (frontend + server + Postgres) for local testing.
