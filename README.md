<<<<<<< HEAD
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
=======
# ERNIt Back: An OCR-Powered Reimbursement Automation and Approval Monitoring System for ERNI Philippines

A comprehensive reimbursement management system designed for ERNI Philippines to simplify expense claim submission, approval workflows, and financial notification processing.

## 📋 Overview

ERNIt Back is a modern web-based reimbursement system that automates the entire expense claim lifecycle—from submission to final approval and payment processing. The system features intelligent receipt processing with OCR, multi-level approval workflows, real-time status tracking, and comprehensive reporting capabilities.

## ✨ Key Features

### For All Users
- **Microsoft Authentication** - Secure single sign-on using Microsoft accounts
- **Receipt Upload & OCR** - Automated text extraction from receipts (up to 5MB)
- **Real-time Status Tracking** - Monitor reimbursement requests through the approval pipeline
- **Email Notifications** - Automated alerts for status updates and pending actions
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Optimized for desktop and mobile browsers

### Role-Based Features

#### Employees
- Submit reimbursement requests with receipt uploads
- Track personal reimbursement status
- View assigned SAP codes for billable work
- Receive policy limit warnings

#### Account Managers & Service Unit Leaders (SUL)
- Review and approve team member reimbursements
- Search and filter team requests
- Submit personal reimbursements
- Export team reports

#### Invoice Specialists
- Process all employee reimbursements
- Validate expense claims against policies
- Generate comprehensive reports
- Submit personal reimbursements (non-billable)

#### Finance Officers
- Final approval authority for all reimbursements
- Access complete approval history
- Export payment processing reports
- Mark requests as ready for payment

#### Sales Directors
- Full system oversight and visibility
- Approve requests from SUL, Account Managers, and Invoice Specialists
- Manage SAP codes (add, edit, delete)
- Manage user accounts and roles
- Generate organization-wide reports

## 🏗️ System Architecture

### Approval Workflow
```
Employee submissions will follow: Employee → Service Unit Leader (SUL) → Account Manager (AM) → Invoice Specialist → Finance Officer
SUL submissions will follow: SUL → Sales Director → Invoice Specialist → Finance Officer
AM submissions will follow: AM → Sales Director → Invoice Specialist → Finance Officer
Invoice Specialist submissions will follow: Invoice Specialist → Sales Director → Invoice Specialist → Finance Officer

```

### Technology Stack
- **Frontend**: React with Material-UI
- **Backend**: Node.js with Express.js
- **Authentication**: Microsoft OAuth 2.0 (Azure Active Directory)
- **OCR**: Google Gemini 2.0 Flash
- **Database**: PostgreSQL (hosted on Supabase)
- **Email**: SendGrid

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Edge, or Firefox recommended)
- Microsoft account (ERNI work account)

### Installation
```bash
# Clone the repository
git clone https://github.com/cdCatungal/reimbursement-capstone.git

# Navigate to project directory
cd reimbursement-capstone

# Install dependencies
cd first-test
npm install

# Run the application (frontend)
cd first-test
npm start

# Run the application (backend)
cd reimbursement-backend
node src/app.js
```

## 📚 User Documentation

Detailed user acceptance testing (UAT) manuals are available for each role:

- **[Employee User Guide](https://drive.google.com/file/d/1LK8cPmwaRsmsMWb_T65cVRangdjmzoM_/view?usp=drive_link)** - For all employees submitting reimbursements
- **[Account Manager Guide](https://drive.google.com/file/d/13VmGJQwH5EKCgAlhEljriYjmy-CqZMoF/view?usp=drive_link)** - For team approvers
- **[Service Unit Leader Guide](https://drive.google.com/file/d/1DhJqRGYdxiVS95qoLy7u4tGI_4VHtN-S/view?usp=drive_link)** - For service unit approvers
- **[Invoice Specialist Guide](https://drive.google.com/file/d/13IBsTy0QFWaOU9jEdJB0PkC8YhD7Ob1-/view?usp=drive_link)** - For expense validators
- **[Finance Officer Guide](https://drive.google.com/file/d/1tc-iSStrsqMeTIg4eGFK9XEx1K8LAwvv/view?usp=drive_link)** - For final approvers
- **[Sales Director Guide](https://drive.google.com/file/d/1SaDNqladpmPbD4F0dmv9MzxQe8M2ZUrK/view?usp=drive_link)** - For system administrators

## 🎯 Key Functionalities

### Reimbursement Submission
1. Upload receipt (max 5MB)
2. Extract text automatically with OCR
3. Fill in merchant details, date, and amount
4. Select reimbursement category and SAP code (if billable)
5. Submit for approval

### Approval Process
1. Receive email notification of pending requests
2. Review request details and receipt
3. Approve or reject with status updates
4. Request moves to next approval level

### Reporting & Export
- Filter by date range, status, and category
- Preview reimbursement data
- Export to Excel for accounting
- Generate statistical summaries

## 🧪 Testing

The system has undergone comprehensive UAT with test scenarios covering:
- Authentication and authorization
- Reimbursement submission workflows
- Approval processes at all levels
- Search, filter, and export functionality
- Email notifications
- Data accuracy and validation
- UI/UX across different roles

## 🐛 Bug Reporting

When reporting bugs, please include:
1. **What you did** - Specific steps taken
2. **Expected behavior** - What should have happened
3. **Actual behavior** - What actually happened
4. **Screenshot** - Capture of the entire screen including address bar

Report bugs to: Son Yolando (External) via MS Teams

## 🔐 Security & Compliance

- Microsoft OAuth authentication
- Role-based access control (RBAC)
- Secure file upload with size validation
- Data privacy in approval workflows
- Audit trail for all approvals

## 📊 System Limits
**When submitting a picture of receipt**
- **Receipt Size**: Maximum 5MB per file
- **File Types**: JPG, JPEG, PNG, and PDF
- **Reimbursement Policies**: Configurable limits per category
- **User Roles**: 6 distinct roles with specific permissions

## 👥 Team

Developed as a capstone project by **Carl Daniel Catungal, Hasanor Dimasimpan, Cathlene Ilagan-Lagumen,** and **Yolando Son III**.

## 📞 Support

For technical support or questions:
- **Team Representative**: Son Yolando (External) (yolando.son@betterask.erni)
- **Communication**: Microsoft Teams
- **Organization**: ERNI Philippines

---

**Built with 💙 for ERNI Philippines**
>>>>>>> origin/main
