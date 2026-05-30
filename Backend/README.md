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

```text
# Create a .env file inside the Backend folder
SECRET_KEY=your_random_key

```

### 6. Create Upload Directory

Ensure an `uploads` folder exists within the `Backend` directory to store files.

### 7. Run the Server

```bash
python app.py

```

The API will be accessible at `http://127.0.0.1:5000`.

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
