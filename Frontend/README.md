# AirShare - File Management System Frontend

A modern, highly responsive React.js frontend application for secure file management, bulk uploading, and controlled file sharing. Built with a premium, sleek glassmorphism theme, robust client-side validation, and state-of-the-art Redux Toolkit global state architecture.

## Features

### User Authentication & Account Security
- **Secure Register & Login**: Comprehensive validation with user profile parameters (first name, last name, DOB, password strength check).
- **OTP Verification**: Sign-ups require a 6-digit verification code sent to the user's email.
- **Password Recovery**: Secure password reset request pages that verify time-limited tokens before allowing password changes.
- **Account Management**: Update user passwords and perform full account deletions (wipes user metadata and physical files from the storage network).
- **Automatic Token Refresh**: Quietly monitors session tokens and requests a refresh from the API to guarantee uninterrupted, secure user sessions.

### Advanced File Management
- **Interactive File Upload**: Supports dragging-and-dropping and multi-file selections.
- **Real-Time Progress Tracking**: Renders dynamic progress bars tracking transfer speeds and percentage completions for files in the upload queue.
- **Bulk File Deletion**: Quick-action buttons to wipe all uploaded files with safety confirmation prompts.
- **Client-Side Validations**: Enforces 100MB individual file caps and checks files against accepted formats (`pdf`, `png`, `jpg`, `jpeg`, `txt`, `docx`, `mp4`, `mov`, `mkv`).

### Secure Sharing Hub
- **Email-Based Sharing**: Share uploads with third parties via email directly from the portal, utilizing customizable expiration timelines (24 hours, 48 hours, 72 hours, or custom duration).
- **Share Links Dashboard**: Monitor generated share links with real-time statistics, including recipient details, access count, creation time, expiration dates, and last accessed timestamps.
- **Link Revocation**: Instantly revoke active share tokens via a confirmation modal, making public links invalid immediately.
- **Public Preview Portal**: A standalone public endpoint (`/share/:token`) that lets recipients safely preview metadata (file type, name, size, expiry) and download the file.

### Premium UI/UX Design
- **Responsive Layout**: Designed mobile-first, fluidly transitioning between mobile devices, tablets, and wide desktop screens.
- **Interactive Hamburger Nav**: Smooth mobile sidebar and dropdown controls.
- **Modern Glassmorphism**: Stunning backdrop filters, subtle gradients, clean shadow styling, and interactive hover feedback.
- **Universal Toast Notifications**: Non-blocking Success and Error toast notifications linked to global Redux actions.

## Tech Stack

- **React.js (Vite)**: Lightning-fast rendering and optimized build scripts.
- **Redux Toolkit**: Centralized store with RTK Query and asynchronous thunks for state orchestration.
- **React Router Dom**: Dynamic client-side routing with route-protection middlewares.
- **Tailwind CSS**: Utility-first CSS layout engine incorporating modern typography (Inter).
- **React Hot Toast**: Beautiful, responsive slide-in notification toasts.
- **Axios Client**: Custom configured HTTP interceptors that handle Bearer authorization headers and auto-inject token refreshes on auth expiry.

---

## Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Backend API server** running (configured in the `Backend` directory)

### Installation Steps

1. **Navigate to the Frontend Folder**
   ```bash
   cd Frontend
   ```

2. **Install Project Dependencies**
   ```bash
   npm install
   ```

3. **Start the Local Development Server**
   ```bash
   npm run dev
   ```

4. **Launch Application in Browser**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```text
src/
├── components/            # Reusable UI component blocks
│   ├── ConfirmModal.jsx   # Generic confirmation modal for destructive operations
│   ├── Layout.jsx         # Global page shell layout wrapper
│   ├── Navbar.jsx         # Premium navigation bar with responsive mobile menu
│   ├── PrivateRoute.jsx   # Restricts access to authenticated users
│   ├── ToastContainer.jsx # Listens to redux notification slices and renders toasts
│   └── UploadWidget.jsx   # Standardized component for file drops and uploads
├── pages/                 # Full Page views
│   ├── Dashboard.jsx      # Home dashboard showing user statistics and storage gauge
│   ├── FileManager.jsx    # File list search, individual actions, and bulk actions
│   ├── ForgotPassword.jsx # Request recovery email link
│   ├── Login.jsx          # Login portal
│   ├── Profile.jsx        # Account dashboard (password change & delete account)
│   ├── Register.jsx       # Multi-step signup form verified by OTP
│   ├── ResetPassword.jsx  # Complete password reset form using active link token
│   ├── SharePreview.jsx   # Public file sharing landing page
│   ├── SharedLinks.jsx    # Complete list and manager of created share logs
│   └── UploadFiles.jsx    # Batch upload screen powered by the UploadWidget
├── redux/                 # Redux state management architecture
│   ├── api/
│   │   └── apiClient.js   # Intercepted Axios Client matching JWT headers
│   ├── slices/            # Application state slices
│   │   ├── authSlice.js   # Stores profile state, sign-in states, OTP triggers
│   │   ├── fileSlice.js   # Handles files, share metrics, upload queue state
│   │   ├── errorSlice.js  # Feeds API errors to the notification system
│   │   ├── successSlice.js# Feeds success messages to the notification system
│   │   └── notificationSlice.js # Keeps track of active notifications
│   └── store.js           # Main Redux store configurations
├── hooks/
│   └── useNotifications.jsx # Hook mapping redux toast alerts
├── utils/                 # General helpers and validators
│   ├── errorHandling.js   # Parses HTTP request errors
│   ├── errorHelpers.js    # Dispatches user-friendly messaging
│   └── validators.js      # Front-end email, DOB, and password strength regex checks
├── styles/
│   └── index.css          # Customized global styles and Tailwind configuration
```

---

## API Endpoints Integrated

| Request Method | Backend Path | Description |
| --- | --- | --- |
| **POST** | `/api/send-otp` | Triggers verification code delivery to email |
| **POST** | `/register` | Submits new account request verified with OTP |
| **POST** | `/login` | Authenticates credentials and logs user in |
| **POST** | `/refresh` | Swaps expired token for a fresh session JWT |
| **GET** | `/user` | Downloads user profile parameters |
| **PUT** | `/user` | Changes password |
| **DELETE** | `/user` | Wipes the user profile and all uploads |
| **POST** | `/upload` | Posts multipart files (VirusTotal & size verified) |
| **GET** | `/files` | Lists active file catalog metadata |
| **DELETE**| `/files/all` | Performs bulk file deletion |
| **GET** | `/download/:id` | Downloads owned file |
| **DELETE**| `/delete/:id` | Removes individual file |
| **POST** | `/share` | Registers share link database entry |
| **GET** | `/shares` | Fetches history of active share links |
| **DELETE**| `/share/:token` | Revokes public access to the shared file |
| **GET** | `/share/info/:token` | Fetches metadata for public shared download page |
| **GET** | `/share/:token` | Direct file retrieval from shared token |

---

## Build and Deployment

### Available Scripts

- `npm run dev`: Boots local Vite hot-reload server.
- `npm run build`: Compiles production-ready bundle assets into the `dist/` directory.
- `npm run preview`: Previews the generated production build locally.
- `npm run lint`: Assesses code conformity using ESLint configuration.

### Deployment Process

1. Build the production files:
   ```bash
   npm run build
   ```
2. Deploy the generated static files located in `dist/` to any hosting provider (e.g. Netlify, Vercel, S3).
3. Ensure the production domain is added to CORS whitelist configurations inside the backend `app.py`.
