# Backend API - Secure File Management System (Task 1)

## Overview

This project is a Flask-based REST API designed for secure user authentication, file management, and controlled public file sharing.

## Key Features

* **JWT Authentication**: Implements token-based access with token blacklisting upon logout, account deletion, or token refresh.
* **Email Verification (OTP)**: Validates user registration via secure 6-digit OTPs sent via Gmail SMTP.
* **Password Recovery**: Secure password reset flow using time-sensitive reset links sent to user emails.
* **Rate Limiting**: Protects endpoints against brute-force and spamming attacks using `Flask-Limiter` (e.g., login capped at 10/min, OTP generation at 5/min, public shared file requests at 30/min).
* **Storage Quotas & Limits**: Enforces a strict maximum file size of 100MB for uploads and a total account storage quota of 1GB per user.
* **File Validation**: Double-checks upload extensions against real file byte headers using `python-magic` to prevent malicious extension spoofing.
* **Virus Scanning**: Automated VirusTotal API integration checks files against threat databases and blocks malicious or suspicious uploads.
* **Privacy Controls**: Restricts download and deletion privileges to the authenticated owner of the file.
* **Secure Sharing**: Allows file sharing with third parties by generating secure, unique sharing tokens with custom expiration policies (default 72 hours), tracking access logs (total downloads and last accessed timestamps).
* **Environment Security**: Safeguards secret keys, database paths, and API keys via localized `.env` configuration.

## Project Structure

```text
Backend/
├── app.py              # Main Flask application with database configuration and API routes
├── database.db         # SQLite database storing users, file maps, blacklisted tokens, OTPs, resets, and share links
├── uploads/            # Secure storage directory for user-uploaded files
├── static/             # Directory for static assets (e.g., airshare-logo.png for SMTP emails)
├── .env                # Secret keys and local application configurations
├── .gitignore          # Excludes build artifacts and environment files from git tracking
└── requirements.txt    # List of required Python packages
```

## Setup & Installation

### 1. Navigate to the Task Folder

Open your terminal and enter the subfolder:

```bash
cd Backend
```

### 2. Environment Isolation

Initialize a local Python virtual environment (`venv`):

```bash
python -m venv venv
```

### 3. Environment Activation

Activate the virtual environment before installing dependencies:

* **Windows (Command Prompt):**
```cmd
venv\Scripts\activate
```

* **macOS / Linux:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file inside the `Backend` folder containing the following configuration:

```text
SECRET_KEY=your_random_secret_key
SMTP_EMAIL=your_gmail@gmail.com
SMTP_PASSWORD=your_16_character_google_app_password
FRONTEND_URL=http://<YOUR_LOCAL_IP>:5173
VIRUSTOTAL_API_KEY=your_virustotal_api_key
```

#### How to Configure Google SMTP App Password:
1. Go to your **Google Account Settings**.
2. Navigate to **Security** -> **2-Step Verification** (must be enabled).
3. Scroll to the bottom of the page and click on **App passwords**.
4. Enter a name for the app (e.g., `AirShare`) and click **Create**.
5. Copy the generated **16-character passcode** (paste it without spaces as `SMTP_PASSWORD`).

#### How to Obtain VirusTotal API Key:
1. Register for a free account at [VirusTotal](https://www.virustotal.com/).
2. Log in and navigate to your profile dashboard to locate your **API Key**.
3. Set the key under the `VIRUSTOTAL_API_KEY` parameter in your `.env`.

---

### 6. Create Upload Directory

Ensure an `uploads` folder exists within the `Backend` directory to store files:

```bash
mkdir uploads
```

---

### 7. Run the Server

```bash
python app.py
```

The API will run locally at `http://localhost:5000` (and `http://<YOUR_LOCAL_IP>:5000` on the network).

---

### 8. Windows Defender Firewall Configuration (For Network Sharing)

To allow other devices on the same local network to access the file-sharing application:
1. Search for and open **Windows Defender Firewall with Advanced Security**.
2. Select **Inbound Rules** (left panel), then click **New Rule...** (right panel).
3. Choose **Port** -> click **Next**.
4. Select **TCP** and enter `5000, 5173` in **Specific local ports** -> click **Next**.
5. Choose **Allow the connection** -> click **Next**.
6. Check all network profile boxes (**Domain**, **Private**, and **Public**) -> click **Next**.
7. Name the rule (e.g., `AirShare Network Ports`) and click **Finish**.

## API Reference

### Authentication & Account Management

| Endpoint | Method | Rate Limit | Description |
| --- | --- | --- | --- |
| `/api/send-otp` | POST | 5/min | Send a 6-digit registration OTP to target email |
| `/register` | POST | - | Register a new user verified by OTP code |
| `/login` | POST | 10/min | Authenticate user credentials and return JWT token |
| `/refresh` | POST | - | Refresh current session token (invalidates old JWT) |
| `/user` | GET | - | Fetch authenticated user profile data |
| `/user` | PUT | - | Update user password (requires current password verification) |
| `/user` | DELETE | - | Delete user account, database entries, and stored files |
| `/api/verify-password` | POST | - | Helper to verify the user's password before changes |
| `/api/forgot-password` | POST | 5/min | Request a password reset link sent via SMTP |
| `/api/verify-reset-token/<token>`| GET | - | Validate if a password reset token is active/not expired |
| `/api/reset-password` | POST | 5/min | Complete password reset using a verified token |

### File Management

| Endpoint | Method | Rate Limit | Description |
| --- | --- | --- | --- |
| `/upload` | POST | - | Upload one or multiple files (Max 100MB per file, VirusTotal checked) |
| `/download/<file_id>` | GET | - | Download owned file by ID |
| `/delete/<file_id>` | DELETE | - | Delete owned file by ID from disk and database |
| `/files/all` | DELETE | - | Bulk delete all files belonging to the authenticated user |
| `/files` | GET | - | List owned files with status, size, and download link |
| `/user/stats` | GET | - | Retrieve storage statistics (active file count, MB used) |

### File Sharing (Public & Private Link Actions)

| Endpoint | Method | Rate Limit | Description |
| --- | --- | --- | --- |
| `/share` | POST | - | Generate public share token for owned file & email recipient |
| `/shares` | GET | - | List all sharing links created by the user |
| `/share/<token>` | DELETE | - | Revoke/delete a created sharing link |
| `/share/info/<token>` | GET | 30/min | Publicly fetch file metadata (filename, size) before downloading |
| `/share/<token>` | GET | 30/min | Download or view the shared file directly via token |
