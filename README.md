# GVBLHS Reunion 2026

A modern, full-stack web application for organizing and managing the Goonvari B. L. High School alumni reunion event.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![License](https://img.shields.io/badge/license-private-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![MongoDB](https://img.shields.io/badge/MongoDB-7.1-green)

---

## Overview

GVBLHS Reunion 2026 is a comprehensive event management platform designed to streamline the reunion registration, payment processing, and ticket generation for Goonvari B. L. High School alumni. The application provides separate dashboards for regular users and administrators, with secure authentication, role-based access control, and a complete payment approval workflow.

### Key Features

- 🔐 **Secure Authentication** - Email/password and Google OAuth sign-in with JWT tokens
- 👥 **User Registration** - Complete profile management with batch and category selection
- 💳 **Flexible Payment Options** - MFS (bKash, Nagad, Rocket), Bank Transfer, and Manual Payment
- ✅ **Admin Approval Workflow** - Payments require admin approval before ticket generation
- 🎫 **Digital Ticket Generation** - Auto-generated tickets with QR codes after approval
- 📝 **Contact Form Integration** - Submitted messages appear in admin dashboard
- 👨‍💼 **Admin Dashboard** - Complete analytics, payment approvals, role management, and message viewing
- 📊 **Role-Based Access Control** - User and Admin roles with appropriate feature access
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.2.3 (App Router)
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS 4 + Custom CSS Variables
- **Component Library**: shadcn/ui
- **State Management**: React Context API
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: Sonner Toast
- **Document Export**: html2canvas + jsPDF
- **QR Code**: qrcode.react

### Backend
- **Runtime**: Node.js
- **Server**: Next.js API Routes
- **Database**: MongoDB 7.1.1
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: PBKDF2 with SHA256
- **OAuth**: Google Firebase

### Development
- **Language**: TypeScript
- **Linting**: ESLint
- **Build**: Next.js Build System
- **Package Manager**: npm

---

## User Roles & Flows

### 1. Student/Guest (Regular User)

**Workflow:**
```
Registration (Account Only)
    ↓
Login (Email/Password or Google OAuth)
    ↓
View/Edit Profile
    ↓
Submit Payment
    ├─ Choose Method: MFS / Bank / Manual
    ├─ Enter Transaction Details (optional for Manual)
    └─ Submit for Admin Approval
    ↓
Wait for Admin Approval (24-48 hours)
    ↓
View Approved Ticket
    ├─ QR Code with unique ID
    ├─ Download as PDF
    └─ Download as PNG Image
```

**Features:**
- Complete profile management (name, email, phone, t-shirt size, batch, category)
- Payment submission with multiple payment methods
- Ticket viewing and download (after approval)
- Contact support form

### 2. Administrator

**Workflow:**
```
Access Admin Dashboard
    ↓
View Registrations & Statistics
    ├─ Total users, students, guests
    ├─ Registration trends
    └─ Payment status overview
    ↓
Manage Payments
    ├─ Review pending payments
    ├─ Verify transaction details
    ├─ Approve or Reject
    └─ Track approval history
    ↓
View Contact Messages
    ├─ Read submitted messages
    ├─ See sender details
    └─ Manage communication
    ↓
Manage User Roles
    ├─ Assign/revoke admin privileges
    ├─ Prevent demoting last admin
    └─ Track role changes
```

**Features:**
- Comprehensive admin dashboard with statistics
- Payment approval workflow with approval tracking
- Contact message viewer with submission details
- User role management system
- Admin action audit trails

---

## Payment Flow

### Payment Methods Supported

#### 1. **MFS (Mobile Financial Services)**
- Providers: bKash, Nagad, Rocket
- Transaction ID: **Required**
- Verification: Admin reviews transaction
- Status Flow: Pending → Approved → Ticket Generated

#### 2. **Bank Transfer**
- Direct bank deposit
- Transaction ID: **Required** (bank reference number)
- Verification: Admin verifies bank statement
- Status Flow: Pending → Approved → Ticket Generated

#### 3. **Manual Payment**
- Arranged directly with event organizers
- Transaction ID: **Optional** (not required)
- Verification: Admin confirms offline payment
- Status Flow: Pending → Approved → Ticket Generated

### Payment Processing Timeline

1. **User submits payment** (0 min)
   - Status: `pending`
   - Ticket ID: Not generated yet

2. **Admin reviews** (within 24-48 hours)
   - Verifies transaction details
   - Checks against payment provider records
   - Approves or rejects

3. **On Admin Approval**
   - Status: `paid`
   - Ticket ID: Auto-generated (unique identifier)
   - Email notification sent (if configured)
   - User can download ticket

4. **On Admin Rejection**
   - Status: `rejected`
   - User notified to resubmit
   - Can submit payment again

---

## Contact Form & Admin Messages

### Contact Form Submission
- Users can submit contact/inquiry forms from `/contact` page
- Fields: Name, Email, Phone (optional), Subject (optional), Message
- Auto-saved to database with timestamp
- Submission confirmation shown to user

### Admin Messages Dashboard
- Accessible at `/admin/messages`
- Shows all contact submissions in chronological order
- Displays: Sender name, email, phone, subject, message, submission date
- Admin can mark messages as read/replied (future feature)
- Search and filter capabilities (future feature)

---

## Ticket Generation & Approval

### Key Rules

1. **Tickets are NOT generated at registration**
   - Registration only creates user account
   - No ticket until payment submitted

2. **Tickets are NOT generated at payment submission**
   - Payment creates a "pending" ticket request
   - Ticket stays pending until admin approval

3. **Tickets ARE generated on admin approval**
   - Admin reviews payment details
   - Clicks "Approve" in admin dashboard
   - System auto-generates ticket with:
     - Unique ticket ID
     - QR code with encoded ticket ID
     - User information
     - Event details
   - Ticket becomes downloadable to user

4. **Duplicate prevention**
   - System prevents creating multiple pending submissions
   - User must wait for admin response before new submission

---

## Installation & Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn
- MongoDB 7.1+ (local or cloud: MongoDB Atlas)

### 1. Clone Repository
```bash
git clone <repository-url>
cd gvblhs-reunion26
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
MONGO_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DATABASE_NAME=reunion2026

# Authentication
JWT_SECRET=your-secure-random-secret-key-here-min-32-chars

# Google OAuth (optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Application
NEXT_PUBLIC_APP_NAME=GVBLHS Reunion 2026
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Application

**Development:**
```bash
npm run dev
```
App will be available at `http://localhost:3000`

**Production Build:**
```bash
npm run build
npm start
```

---

## Deployment

### MongoDB Atlas Setup
1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Generate connection string with credentials
4. Add connection string to `.env.local`
5. Whitelist application IP in Atlas

### Vercel Deployment (Recommended)
1. Push code to GitHub
2. Connect repository to [Vercel](https://vercel.com)
3. Set environment variables in project settings
4. Deploy automatically on push

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Current user info
- `PUT /api/auth/update` - Update profile

### Tickets & Payments
- `GET /api/tickets` - Get user's tickets
- `POST /api/tickets` - Submit payment/create ticket request
- `GET /api/admin/tickets` - Admin: List all tickets
- `PATCH /api/admin/tickets` - Admin: Approve/reject payment

### User Profile
- `GET /api/profile` - Get authenticated user's profile
- `PUT /api/profile` - Update user profile

### Admin
- `GET /api/admin/profiles` - Admin: List all user profiles
- `GET /api/admin/messages` - Admin: Get contact messages
- `POST /api/admin/users` - Admin: Manage user roles

See [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) for detailed endpoint documentation.

---

## Admin Approval Note ⚠️

**Important**: Tickets are **NOT** automatically generated when users submit payments. The workflow requires explicit admin approval:

1. User registers → Account created
2. User submits payment → Status: `pending`
3. Admin reviews in `/admin/tickets` → Verifies transaction
4. Admin clicks "Approve" → Status: `paid`, Ticket ID generated
5. User can download ticket from `/ticket`

**This ensures proper payment verification and control over event capacity.**

---

## Security Features

- **JWT Tokens**: 7-day expiration with secure httpOnly cookies
- **Password Hashing**: PBKDF2 with SHA256, 100,000 iterations
- **CORS**: Configured to prevent cross-origin attacks
- **Injection Protection**: MongoDB query parameterization
- **XSS Protection**: Built-in with Next.js and React
- **Role-Based Access Control**: Admin routes protected at API level
- **Email Validation**: Regex pattern matching and unique constraints
- **Type Safety**: Full TypeScript throughout

---

## Color System

The application uses a unified gold and midnight navy palette:

- **Primary**: Gold (#d4b563)
- **Dark**: Midnight Navy (#0f172a)
- **Secondary**: Light Navy (#1a1f35)
- **Accent**: Light Cream (#ebd6af)
- **Destructive**: Red (#f45561)

---

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic

### Testing
- Test authentication flows
- Verify payment workflows
- Test role-based access control
- Perform end-to-end testing before deployment

---

## Future Improvements

- 📧 Email notifications for payment status
- 📊 Advanced analytics and reporting
- 🎫 Bulk ticket generation
- 💬 Real-time messaging
- 🔐 Two-factor authentication (2FA)
- 📱 Mobile app
- 🌐 Multi-language support

---

## License

**Private** - Owned by Goonvari B. L. High School Alumni Association. Unauthorized use prohibited.

---

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Last Updated**: April 16, 2026
