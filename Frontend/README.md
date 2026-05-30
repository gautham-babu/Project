# AirShare - File Management System

A modern, responsive React.js frontend application for file sharing and user management, built with Redux state management and comprehensive authentication features.

## Features

### User Authentication
- User Registration with form validation
- Secure Login with JWT token management
- Automatic Token Refresh for seamless sessions
- Profile Management with user details

### File Management
- File Upload with drag-and-drop support
- File Download with secure links
- File Listing with organized display
- File Type Validation for security

### Modern UI/UX
- Responsive Design - Mobile-first approach with hamburger navigation
- Glassmorphism Effects - Modern backdrop blur and transparency
- Professional Theme - Clean, minimalistic design with rounded corners
- Toast Notifications - Centralized error and success messaging
- Loading States - Smooth user experience with loading indicators

## Tech Stack

### Frontend
- **React.js** - Component-based UI library
- **Redux Toolkit** - State management with RTK Query
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **React Hot Toast** - Beautiful toast notifications
- **Vite** - Fast development and build tool

### Backend Integration
- **JWT Authentication** - Secure token-based auth
- **RESTful API** - Clean API integration
- **File Upload/Download** - Multipart form data handling
- **CORS Configuration** - Cross-origin resource sharing

## Responsive Design

### Mobile (< 768px)
- Hamburger menu navigation
- Centered login/register forms
- Touch-optimized buttons
- Mobile-friendly file upload

### Tablet (768px - 1024px)
- Balanced layout with proper spacing
- Medium-sized navigation elements
- Optimized form positioning

### Desktop (> 1024px)
- Full navigation bar
- Left-aligned authentication forms
- Spacious layout with hover effects
- Large logo and branding

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Backend API server running on `http://127.0.0.1:5000`

### Installation Steps

1. **Navigate to the Task Folder**
   ```bash
   cd Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   Note: All required dependencies are listed in `package.json`. See `DEPENDENCIES.md` for detailed information about each package and manual installation instructions if needed.

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   ```
   http://localhost:5173
   ```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Layout.jsx       # Main layout wrapper
│   ├── Navbar.jsx       # Navigation with hamburger menu
│   └── ProtectedRoute.jsx # Route protection
├── pages/               # Main application pages
│   ├── Login.jsx        # Authentication login
│   ├── Register.jsx     # User registration
│   ├── Dashboard.jsx    # Main dashboard
│   ├── FileManager.jsx  # File operations
│   └── Profile.jsx      # User profile management
├── redux/               # State management
│   ├── slices/          # Redux slices
│   │   ├── authSlice.js # Authentication state
│   │   ├── errorSlice.js # Error handling
│   │   └── successSlice.js # Success notifications
│   └── store.js         # Redux store configuration
├── hooks/               # Custom React hooks
│   └── useNotifications.jsx # Toast notifications
├── utils/               # Utility functions
│   └── errorHelpers.js  # Error message handling
└── styles/              # CSS and styling
    └── index.css        # Global styles and Tailwind
```

## API Endpoints

The frontend integrates with these backend endpoints:

- **POST** `/register` - User registration
- **POST** `/login` - User authentication
- **GET** `/user` - Get user profile
- **POST** `/refresh` - Refresh JWT token
- **POST** `/upload` - File upload
- **GET** `/download/:id` - File download using UUID-backed file IDs
- **DELETE** `/delete/:id` - Delete a file using UUID-backed file IDs
- **GET** `/files` - List uploaded files with metadata

## Security Features

- **JWT Token Management** - Secure authentication with automatic refresh
- **Form Validation** - Client-side input validation and sanitization
- **File Type Validation** - Restricted file uploads for security
- **Protected Routes** - Authentication-required pages
- **CORS Configuration** - Proper cross-origin request handling

## Design Features

### Branding
- **AirShare Logo** - Custom cloud-themed branding
- **Professional Color Scheme** - Blue and gray palette
- **Modern Typography** - Clean, readable fonts

### Animations & Effects
- **Smooth Transitions** - Hover and focus animations
- **Glassmorphism** - Backdrop blur effects on forms
- **Loading Animations** - Professional loading states
- **Toast Notifications** - Slide-in success/error messages

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Configuration
The application automatically connects to:
- **Backend API**: `http://127.0.0.1:5000`
- **Frontend Dev Server**: `http://localhost:5173`

## Dependencies

This project uses several key dependencies. For detailed information about each package and manual installation instructions, refer to `DEPENDENCIES.md`.

### Key Dependencies
- `@reduxjs/toolkit` - Redux state management
- `react-router-dom` - Client-side routing
- `react-hot-toast` - Toast notifications
- `axios` - HTTP client for API calls
- `tailwindcss` - CSS framework

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your hosting platform

3. **Ensure backend CORS** includes your production domain

## Contributing

This project is part of the RapidRise 2026 Frontend Assignment. For development guidelines and contribution instructions, please refer to the project documentation.

---

**Built with React.js, Redux, and Tailwind CSS**
