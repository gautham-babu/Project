# Dependencies

This document lists the packages and dependencies used in the AirShare application.

## Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 7.0.0 or higher
- Backend API server running on `http://127.0.0.1:5000`

## Installation

```bash
npm install
```

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.4 | Core React library |
| `react-dom` | ^19.2.4 | React DOM bindings |
| `@reduxjs/toolkit` | ^2.11.2 | Redux state management |
| `react-redux` | ^9.2.0 | React Redux bindings |
| `react-router-dom` | ^7.14.0 | Client-side routing |
| `axios` | ^1.14.0 | HTTP client for API calls |
| `react-hook-form` | ^7.72.1 | Form handling |
| `react-hot-toast` | ^2.6.0 | Toast notifications |

## Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^8.0.1 | Build tool |
| `@vitejs/plugin-react` | ^6.0.1 | Vite React plugin |
| `tailwindcss` | ^3.4.19 | CSS framework |
| `autoprefixer` | ^10.4.27 | CSS post-processor |
| `postcss` | ^8.5.8 | CSS processor |
| `eslint` | ^9.39.4 | JavaScript linter |
| `@eslint/js` | ^9.39.4 | ESLint configuration |
| `eslint-plugin-react-hooks` | ^7.0.1 | React Hooks linting |
| `eslint-plugin-react-refresh` | ^0.5.2 | React Fast Refresh |
| `globals` | ^17.4.0 | ESLint globals |
| `@types/react` | ^19.2.14 | React TypeScript definitions |
| `@types/react-dom` | ^19.2.3 | React DOM TypeScript definitions |

## Manual Installation

If `npm install` fails, install packages manually:

```bash
# Core dependencies
npm install react react-dom @reduxjs/toolkit react-redux react-router-dom axios react-hook-form react-hot-toast

# Development dependencies
npm install --save-dev vite @vitejs/plugin-react tailwindcss autoprefixer postcss eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals @types/react @types/react-dom
```

## Troubleshooting

**Common Issues:**
- **Cache issues**: `npm cache clean --force`
- **Node version**: Ensure Node.js 16+ is installed
- **Reinstall**: Delete `node_modules` and `package-lock.json`, then run `npm install`

**Security:**
```bash
npm audit          # Check vulnerabilities
npm audit fix      # Fix vulnerabilities
```

## Browser Support

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+