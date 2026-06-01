# AirShare - Secure File Management and Sharing Platform

## System Overview

AirShare is a secure, responsive, and modern web application designed for personal file management and controlled peer-to-peer file sharing. The system integrates advanced security protocols, including real-time antivirus scans, strict user storage quotas, time-bound access links, and multi-factor verification mechanisms to ensure high data integrity and privacy.

---

## Technical Stack

### Frontend Architecture
* **Core Framework**: React.js configured with Vite for optimized building and rendering processes.
* **State Management**: Redux Toolkit utilizing asynchronous thunks and centralized slice states for file uploads, share links, notifications, and session states.
* **Routing**: React Router Dom implementing private route validation and dynamic path parsing.
* **Styling**: Tailwind CSS utilizing responsive grid layouts, custom shadow layers, backdrop blurs, and transitional elements.
* **Notification System**: React Hot Toast tied directly to Redux-dispatched actions to render success and error responses.
* **API Communication**: Axios Client with custom request and response interceptors to automatically handle authorization headers and token refresh routines.

### Backend Infrastructure
* **Core Framework**: Flask API using Python 3.
* **Database**: SQLite3 managing relational structures for user accounts, file registries, blacklisted tokens, email verification codes, password reset requests, and sharing logs.
* **Security & Verification**:
  * **MIME Verification**: python-magic analyzing raw byte signatures of files to match extensions and prevent format spoofing.
  * **Antivirus Scanning**: VirusTotal API integration querying hash signatures and uploading unknown files to run scanning runs before disk persistence.
  * **Session Validation**: PyJWT generating local tokens with token blacklist tables.
  * **Rate Limiting**: Flask-Limiter enforcing strict traffic constraints to block brute-force attempts on sensitive endpoints.
  * **SMTP Service**: smtplib handles transactional email workflows through Google SMTP servers.

---

## Core Security Features and Malware Scans

### VirusTotal Threat Protection
During the file upload process, the backend enforces a multi-tier scanning workflow before saving any file to the server storage:
1. **Hash Verification**: A SHA-256 hash of the uploaded file stream is calculated and sent to the VirusTotal API.
2. **Analysis Check**: If the file hash exists in the VirusTotal database, its recent analysis report is reviewed. Files flagged as malicious or suspicious are immediately blocked, and the transaction is aborted.
3. **Sandbox Upload**: If the hash is unknown, the file is uploaded to the VirusTotal servers. The system polls the analysis status (up to 20 cycles) and only saves the file if it receives a clean diagnostic.
4. **Configuration Bypass**: If no VirusTotal API key is configured on the server, uploads are blocked as a safeguard.

### File Verification
File uploads are restricted to a defined whitelist of extensions: pdf, png, jpg, jpeg, txt, docx, mp4, mov, mkv. The system verifies both the file extension and the internal byte signatures using python-magic. If the physical headers do not match the declared extension, the file is rejected.

### Storage Constraints
The backend enforces storage bounds at both the file and account levels:
* **Single File Limit**: Individual file uploads are capped at 100MB.
* **User Account Storage Quota**: The total storage occupied by any single user is limited to 1GB.
### Network and Authentication Security
* **JWT Access Control**: All file and user actions require a valid token. If a token expires, the system uses a secure refresh workflow to issue a new session token while blacklisting the old one to mitigate token theft.
* **Rate Limits**:
  * Login attempts: 10 per minute.
  * OTP generation requests: 5 per minute.
  * Password reset link generation: 5 per minute.
  * Password reset completions: 5 per minute.
  * Public shared file queries: 30 per minute.
* **Token Blacklisting**: Tokens are written to a database blacklist upon user logout, account deletion, or token refresh to prevent reuse of stale credentials.

---

## User Capabilities and Platform Interactions

### Authentication and Account Setup
* **Verification Sign-up**: Registering an account requires inputting user details and confirming a 6-digit OTP code sent to the email address.
* **Password Recovery**: Users can request recovery emails. The system generates a time-sensitive reset link containing a UUID token that expires in 15 minutes.
* **Profile Settings**: Users can view profile details, update their password (requiring verification of the current password), or delete their account. Account deletion automatically purges all metadata and files associated with the user from the disk.

### File Dashboard and Actions
* **Multi-File Upload**: Users can drag and drop multiple files into the interface. The application shows progress bars tracking transfer percentages and queue status.
* **File Management**: View a table of uploaded files showing size, upload date, and accessibility status. Users can search for files, download individual files, delete files, or execute a bulk delete operation to clear all files.

### Controlled Sharing Portal
* **Share Link Creation**: Users can generate public download tokens for their files. The system prompts for a recipient email and an expiry time (1 hour, 1 day, 7 days).
* **Automated SMTP Notification**: When a share link is created, the server formats and sends a styled email to the recipient containing the file name, owner name, expiry date, and secure link.
* **Share Manager**: A dedicated view lists all active links created by the user, showing the recipient email, access count, last accessed date, and active/expired status. Users can revoke/delete any link at any time.
* **Public File Landing Page**: Recipients opening the link land on a secure preview page displaying the file details. Clicking download requests the file from the server, incrementing the access counter and updating the last accessed timestamp.

---

## Setup and Running Instructions

To run the application locally, you must set up both the backend API and the frontend client.

### Prerequisites
* Python 3.8 or higher installed on your server.
* Node.js v18 or higher installed.

### Part 1: Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Initialize and activate a virtual environment:
   * Windows:
     ```cmd
     python -m venv venv
     venv\Scripts\activate
     ```
   * macOS/Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file inside the `Backend` directory:
   ```text
   SECRET_KEY=your_secret_key
   SMTP_EMAIL=your_gmail_address@gmail.com
   SMTP_PASSWORD=your_16_character_google_app_password
   FRONTEND_URL=http://localhost:5173
   VIRUSTOTAL_API_KEY=your_virustotal_api_key
   ```
5. Run the Flask application:
   ```bash
   python app.py
   ```
   The backend server will run at `http://localhost:5000`.

### Part 2: Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend application will be hosted at `http://localhost:5173`.

### Part 3: Local Network Access and Firewall Setup
To allow other devices connected to the same Wi-Fi network (such as mobile devices) to download shared files:
1. Identify your local IP address (e.g., `192.168.1.100`) via `ipconfig` (Windows) or `ifconfig` (macOS/Linux).
2. Configure the `FRONTEND_URL` in the backend `.env` file to map to `http://<YOUR_LOCAL_IP>:5173`.
3. Open Windows Defender Firewall with Advanced Security.
4. Add a new **Inbound Rule** targeting **TCP** ports `5000, 5173`. Set the action to **Allow the connection** across all profiles (Domain, Private, Public).
5. Devices on the network can now access the system using `http://<YOUR_LOCAL_IP>:5173`.
