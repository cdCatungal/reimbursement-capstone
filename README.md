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
