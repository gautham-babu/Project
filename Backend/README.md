# Backend API - Secure File Management System (Task 1)

## Overview

This project is a Flask-based REST API designed for secure user authentication and file management.

## Key Features

* **JWT Authentication**: Implements token-based access with a strict 5-minute expiration window.
* **Token Blacklisting**: Automatically deactivates tokens upon logout, account deletion, or token refresh.
* **Rate Limiting**: Protects against brute-force attacks by limiting `/login` attempts to 10 per minute.
* **100MB File Limit**: Enforces a maximum file size of 100MB for all uploads.
* **Privacy Controls**: Ensures users can only access and download files they have personally uploaded.
* **Environment Security**: Uses `.env` files to store sensitive configurations like the `SECRET_KEY`.

## Project Structure

```text
Backend/
├── app.py              # Main Flask application
├── database.db         # SQLite database (Auto-created on first run)
├── uploads/            # Secure storage for user-uploaded files
├── .env                # Template for local environment setup
├── .gitignore          # Prevents sensitive files from being tracked
└── requirements.txt    # List of dependencies

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

You must activate the environment before installing dependencies or executing the application.

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

Create a `.env` file inside the `Backend` folder containing the following:
```text
SECRET_KEY=your_random_key
SMTP_EMAIL=your_gmail@gmail.com
SMTP_PASSWORD=your_16_character_google_app_password
FRONTEND_URL=http://<YOUR_LOCAL_IP>:5173
```

#### How to Configure Google SMTP App Password:
To allow the backend to send emails (signups, OTPs, and password reset links) through Google's SMTP servers:
1. Go to your **Google Account Settings**.
2. Navigate to **Security** -> **2-Step Verification** (make sure 2-Step Verification is turned ON).
3. Scroll to the bottom of the page and click on **App passwords**.
4. Enter a name for the app (e.g. `AirShare`) and click **Create**.
5. Copy the generated **16-character passcode** (it looks like `xxxx xxxx xxxx xxxx`).
6. Paste this code (without spaces) as the value for `SMTP_PASSWORD` in your `.env` file.

---

### 6. Create Upload Directory

Ensure an `uploads` folder exists within the `Backend` directory to store files.

---

### 7. Run the Server

```bash
python app.py
```

The API will be accessible at `http://localhost:5000` (locally) and `http://<YOUR_LOCAL_IP>:5000` (on your network).

---

### 8. Windows Defender Firewall Configuration (For Network Sharing)

To allow other devices (like smartphones or laptops connected to the same Wi-Fi) to access the file-sharing app and download files, you must configure Windows Defender Firewall to allow traffic on ports `5000` and `5173`:
1. Search for and open **Windows Defender Firewall with Advanced Security** in the Windows Start menu.
2. Select **Inbound Rules** in the left panel, then click **New Rule...** in the right panel.
3. Choose **Port** -> click **Next**.
4. Select **TCP** and enter `5000, 5173` in **Specific local ports** -> click **Next**.
5. Choose **Allow the connection** -> click **Next**.
6. Check all boxes (**Domain**, **Private**, and **Public**) -> click **Next**.
7. Name the rule (e.g. `AirShare Network Ports`) and click **Finish**.

## API Reference

| Endpoint | Method | Description |
| --- | --- | --- |
| `/register` | POST | Register a new user |
| `/login` | POST | Login and receive JWT (10/min limit) |
| `/user` | GET/PUT/DELETE | Profile management and account deletion |
| `/refresh` | POST | Invalidate old token and get a new one |
| `/upload` | POST | Securely upload file(s) (Max 100MB each) |
| `/download/<file_id>` | GET | Download owned file by UUID |
| `/delete/<file_id>` | DELETE | Delete owned file by UUID |
| `/files` | GET | List uploaded files with metadata |
| `/user/stats` | GET | Get user storage and file usage stats |
