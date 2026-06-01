import json, os, random, re, smtplib, sqlite3, uuid
import urllib.request, urllib.error
from datetime import datetime
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import wraps
from time import sleep, time
from urllib.parse import urlparse

import jwt, magic
from flask import Flask, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_uploads import UploadSet, configure_uploads
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

def get_frontend_url():
    # Prefer the real browser origin when creating shared links.
    try:
        origin = request.headers.get('Origin')
        if origin and 'localhost' not in origin and '127.0.0.1' not in origin:
            return origin.rstrip('/')
        referer = request.headers.get('Referer')
        if referer and 'localhost' not in referer and '127.0.0.1' not in referer:
            parsed = urlparse(referer)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
    except RuntimeError:
        pass
        
    frontend_url = os.getenv('FRONTEND_URL')
    if not frontend_url or 'localhost' in frontend_url or '127.0.0.1' in frontend_url:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return f"http://{ip}:5173"
        except Exception:
            pass
            
    return (frontend_url or 'http://localhost:5173').rstrip('/')

#Fetching the secret key, Set it in your .env file and app limits set
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['UPLOADED_FILES_DEST'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 1*1024*1024*1024 # 1 GB maximum account storage limit
app.config['MAX_STORAGE_PER_USER'] = 1*1024*1024*1024  # 1 GB limit per user


def init_database():
    # Create local tables on boot
    with sqlite3.connect("database.db") as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS users(
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                date_of_birth TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        con.execute("CREATE TABLE IF NOT EXISTS blacklist(token TEXT)")
        con.execute("""
            CREATE TABLE IF NOT EXISTS file_map(
                id TEXT PRIMARY KEY,
                owner_email TEXT NOT NULL,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL UNIQUE,
                size INTEGER NOT NULL,
                uploaded_at INTEGER NOT NULL,
                FOREIGN KEY(owner_email) REFERENCES users(email)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS share_links(
                token TEXT PRIMARY KEY,
                file_id TEXT NOT NULL,
                owner_email TEXT NOT NULL,
                recipient_email TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                access_count INTEGER NOT NULL DEFAULT 0,
                last_accessed_at INTEGER,
                status TEXT NOT NULL DEFAULT 'active',
                FOREIGN KEY(file_id) REFERENCES file_map(id),
                FOREIGN KEY(owner_email) REFERENCES users(email)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS signup_otps(
                email TEXT PRIMARY KEY,
                otp TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS password_resets(
                email TEXT PRIMARY KEY,
                token TEXT NOT NULL UNIQUE,
                expires_at INTEGER NOT NULL
            )
        """)
        cur = con.cursor()
        cur.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cur.fetchall()]
        if "created_at" not in columns:
            con.execute("ALTER TABLE users ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0")
            con.execute("UPDATE users SET created_at = ? WHERE created_at = 0", (int(time()),))


init_database()
#Prevents brute-force attacks
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["50 per hour", "200 per day"],
    storage_uri="memory://",
)

#Allowed file types for upload
user_files = UploadSet('files', ('pdf', 'png', 'jpg', 'jpeg', 'txt', 'docx', 'mp4', 'mov', 'mkv'))
configure_uploads(app, user_files)

#JWT authentication
def require_auth_token(protected_route):
    @wraps(protected_route)
    def security_wrapper(*args, **kwargs):
        
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return {"error" : "Authentication token is missing. Please log in first."}, 401
            
        try:
            #Handles both 'Bearer <token>' and direct token formats
            if auth_header.startswith('Bearer '):
                extracted_token = auth_header.split(" ")[1]
            else:
                extracted_token = auth_header

            #Verify that the token hasn't been blacklisted
            with sqlite3.connect("database.db") as con:
                cur = con.cursor()
                cur.execute("SELECT * FROM blacklist WHERE token=?", (extracted_token,))
                if cur.fetchone():
                    return {"error" : "This token has been deactivated. Please log in again."}, 401

            token_data = jwt.decode(extracted_token, app.config['SECRET_KEY'], algorithms=["HS256"])
            authenticated_user = token_data['user']
            
        except:
            return {"error" : "Token is invalid or has been expired. Please log in again to continue."}, 401
            
        return protected_route(authenticated_user, *args, **kwargs)
        
    return security_wrapper
#Password validation
def validate_password(password):
    if not password:
        return "Password is required"
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    if not any(char.isdigit() for char in password):
        return "Password must include a number"
    if not any(char.isupper() for char in password):
        return "Password must include an uppercase letter"
    if not any(char in "!@#$%^&*" for char in password):
        return "Password must include a special character (!@#$%^&*)"
    if not re.match("^[a-zA-Z0-9!@#$%^&*_ -]*$", password):
        return "Illegal characters in password."
    
    return None  #Validation successful


def validate_email(email):
    if not email:
        return "Email address is required"
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return "Please enter a valid email address"
    return None


def validate_name(value, field_name):
    if not value:
        return f"{field_name} is required"
    if not re.match(r"^[a-zA-Z ]{2,50}$", value):
        return f"{field_name} can only contain letters and spaces"
    return None


def validate_date_of_birth(date_of_birth):
    if not date_of_birth:
        return "Date of birth is required"
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_of_birth):
        return "Date of birth must be in YYYY-MM-DD format"
    try:
        birth_date = datetime.strptime(date_of_birth, "%Y-%m-%d")
    except ValueError:
        return "Date of birth must be in YYYY-MM-DD format"
    
    today = datetime.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    if age < 13:
        return "You must be at least 13 years of age to register"
    return None


def verify_file_content(file_stream, extension):
    # Check the file header, not only the extension.
    header = file_stream.read(2048)
    file_stream.seek(0)
    
    if not header:
        return False
        
    ext = extension.lower()
    
    try:
        mime = magic.from_buffer(header, mime=True)
    except Exception:
        return False

    allowed_mimes = {
        'pdf': ['application/pdf'],
        'png': ['image/png'],
        'jpg': ['image/jpeg', 'image/pjpeg'],
        'jpeg': ['image/jpeg', 'image/pjpeg'],
        'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
        'mkv': ['video/x-matroska', 'video/mkv'],
        'mp4': ['video/mp4'],
        'mov': ['video/quicktime'],
        'txt': ['text/plain']
    }
    
    mimes = allowed_mimes.get(ext, [])
    if ext == 'txt':
        return mime.startswith('text/')
    return mime in mimes


def scan_file_virustotal(file_stream):
    import hashlib
    
    # Uploads are blocked unless VirusTotal gives a clean result.
    api_key = os.getenv('VIRUSTOTAL_API_KEY')
    if not api_key:
        return False, "VirusTotal API key is not configured. Upload blocked."
        
    file_stream.seek(0)
    file_bytes = file_stream.read()
    file_stream.seek(0)  # Rewind before Flask saves the file.
    
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    def read_json(req, timeout=30):
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode())

    def check_stats(stats):
        malicious_count = stats.get("malicious", 0)
        suspicious_count = stats.get("suspicious", 0)

        if malicious_count > 0 or suspicious_count > 1:
            return False, f"Flagged by VirusTotal ({malicious_count} malicious, {suspicious_count} suspicious)."
        return True, "File is clean."

    def make_request(url, method="GET", data=None, content_type=None):
        headers = {"x-apikey": api_key}
        if content_type:
            headers["Content-Type"] = content_type
        return urllib.request.Request(url, data=data, headers=headers, method=method)

    def build_multipart(file_bytes, filename):
        boundary = f"----AirShare{uuid.uuid4().hex}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            "Content-Type: application/octet-stream\r\n\r\n"
        ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
        return body, f"multipart/form-data; boundary={boundary}"

    file_lookup_url = f"https://www.virustotal.com/api/v3/files/{sha256_hash}"
    try:
        result = read_json(make_request(file_lookup_url), timeout=15)
        attributes = result.get("data", {}).get("attributes", {})
        return check_stats(attributes.get("last_analysis_stats", {}))
    except urllib.error.HTTPError as e:
        if e.code != 404:
            if e.code in (401, 403):
                return False, "VirusTotal API key is invalid. Upload blocked."
            if e.code == 429:
                return False, "VirusTotal rate limit reached. Upload blocked."
            return False, f"VirusTotal lookup failed with error code {e.code}. Upload blocked."
    except Exception as e:
        return False, f"VirusTotal lookup failed: {str(e)}. Upload blocked."

    # Unknown hashes (404) are permitted immediately to prevent slow blocking scans that trigger rate limits.
    return True, "File is clean (new file)."





# Step one of the password change flow.
@app.route('/api/verify-password', methods=['POST'])
@require_auth_token
def verify_password(authenticated_user):
    data = request.get_json()
    current_password = data.get('currentPassword')
    if not current_password:
        return {"error": "Current password is required."}, 400
    with sqlite3.connect("database.db") as con:
        cur = con.cursor()
        cur.execute("SELECT password FROM users WHERE email = ?", (authenticated_user,))
        row = cur.fetchone()
        if not row:
            return {"error": "User not found."}, 404
        if not check_password_hash(row[0], current_password):
            return {"error": "Current password is incorrect."}, 401
    return {"message": "Password verified."}, 200

#User management: Fetching, updating password, or deleting users
@app.route('/user', methods=['GET', 'PUT', 'DELETE'])
@require_auth_token
def manage_user(authenticated_user):
    if request.method == 'GET':
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT first_name, last_name, email, date_of_birth, created_at FROM users WHERE email = ?",
                (authenticated_user,)
            )
            row = cur.fetchone()

        if not row:
            return {"error" : "User not found."}, 404

        first_name, last_name, email, date_of_birth, created_at = row
        return {
            "message" : f"Welcome back, {first_name}",
            "user": {
                "firstName": first_name,
                "lastName": last_name,
                "email": email,
                "dateOfBirth": date_of_birth,
                "createdAt": created_at
            }
        }
    if request.method == 'PUT':
        data = request.get_json()
        current_password = data.get('currentPassword')
        new_password = data.get('password')

        if not current_password or not new_password:
            return {"error" : "Current password and new password are required."}, 400

        password_error = validate_password(new_password)
        if password_error:
            return {"error" : password_error}, 400

        if current_password == new_password:
            return {"error" : "New password must be different from the current password."}, 400

        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute("SELECT password FROM users WHERE email = ?", (authenticated_user,))
            row = cur.fetchone()
            if not row:
                return {"error" : "User not found."}, 404

            current_hashed = row[0]
            if not check_password_hash(current_hashed, current_password):
                return {"error" : "Current password is incorrect."}, 400

            new_hashed = generate_password_hash(new_password)
            con.execute("UPDATE users SET password = ? WHERE email = ?", (new_hashed, authenticated_user))

        return {"message" : "Password updated successfully."}

    if request.method == 'DELETE':
        auth_header = request.headers.get('Authorization')
        token_to_delete = auth_header.split(" ")[1] if " " in auth_header else auth_header

        # Remove user files before deleting the account row.
        try:
            upload_dir = app.config['UPLOADED_FILES_DEST']
            with sqlite3.connect("database.db") as con:
                cur = con.cursor()
                cur.execute("SELECT stored_name FROM file_map WHERE owner_email = ?", (authenticated_user,))
                stored_files = cur.fetchall()

            for (stored_name,) in stored_files:
                file_path = os.path.join(upload_dir, stored_name)
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except OSError:
                    # Keep going if one file is already missing or locked.
                    pass
        except Exception:
            # Continue with account deletion even if file deletion fails
            pass

        with sqlite3.connect("database.db") as con:
            # Drop metadata and invalidate the current token.
            con.execute("DELETE FROM file_map WHERE owner_email = ?", (authenticated_user,))
            con.execute("DELETE FROM users WHERE email = ?", (authenticated_user,))
            con.execute("INSERT INTO blacklist(token) VALUES(?)", (token_to_delete,))

        return {"message" : "Account deleted successfully."}

@app.route('/api/send-otp', methods=['POST'])
@limiter.limit("5 per minute")
def send_otp():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    email_error = validate_email(email)
    if email_error:
        return {"error": email_error}, 400

    # Do not send signup codes for existing accounts.
    with sqlite3.connect("database.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM users WHERE email=?", (email,))
        if cur.fetchone():
            return {"error": "Email address is already registered"}, 409

    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"

    # Re-sending replaces the old code.
    with sqlite3.connect("database.db") as con:
        con.execute(
            "INSERT OR REPLACE INTO signup_otps(email, otp, created_at) VALUES(?, ?, ?)",
            (email, otp, int(time()))
        )

    # Email credentials come from the backend environment.
    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_password = os.getenv('SMTP_PASSWORD')
    if not smtp_email or not smtp_password:
        return {"error": "Email service is not configured on the backend env."}, 500

    subject = "Verify your email address - AirShare"

    # load the logo image
    logo_data = None
    try:
        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static/airshare-logo.png'))
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as f:
                logo_data = f.read()
    except Exception as e:
        print(f"Error loading logo: {e}")

    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = smtp_email
    msg['To'] = email

    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)

    if logo_data:
        logo_html = '<img src="cid:logo_img" alt="AirShare" style="max-width: 120px; height: auto; margin-bottom: 15px; display: block;">'
    else:
        logo_html = '<h2 style="color: #3b82f6; margin-top: 0;">AirShare</h2>'

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      {logo_html}
      <h3 style="color: #111827; margin-top: 0;">Verify Your Email</h3>
      <p>Thank you for signing up for AirShare! Use the following 6-digit verification code to complete your registration:</p>
      <p style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #3b82f6; margin: 20px 0;">{otp}</p>
      <p style="font-size: 13px; color: #6b7280; margin: 0;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
    """
    msg_alternative.attach(MIMEText(html_content, 'html'))

    # Attach logo image
    if logo_data:
        try:
            mime_img = MIMEImage(logo_data)
            mime_img.add_header('Content-ID', '<logo_img>')
            mime_img.add_header('Content-Disposition', 'inline', filename='airshare-logo.png')
            msg.attach(mime_img)
        except Exception as e:
            print(f"Error attaching logo: {e}")

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, [email], msg.as_string())
        return {"message": "OTP sent successfully."}, 200
    except Exception as e:
        print(f"SMTP Error sending OTP: {e}")
        return {"error": "Failed to send verification email. Please try again later."}, 500

# Create a user after OTP verification.
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    required_fields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'dateOfBirth', 'otp']
    if not data or any(not data.get(field) for field in required_fields):
        return {"error" : "All registration fields are required, including email verification code"}, 400

    first_name = data.get('firstName').strip()
    last_name = data.get('lastName').strip()
    email = data.get('email').strip().lower()
    password = data.get('password')
    confirm_password = data.get('confirmPassword')
    date_of_birth = data.get('dateOfBirth').strip()
    otp_code = data.get('otp').strip()

    for field_error in (
        validate_name(first_name, "First name"),
        validate_name(last_name, "Last name"),
        validate_email(email),
        validate_date_of_birth(date_of_birth),
    ):
        if field_error:
            return {"error" : field_error}, 400
    
    password_error = validate_password(password)
    if password_error:
        return {"error" : password_error}, 400

    if password != confirm_password:
        return {"error" : "Passwords do not match"}, 400

    hashed_password = generate_password_hash(password)

    with sqlite3.connect("database.db") as con:
        cur = con.cursor()

        # OTPs expire after ten minutes.
        cur.execute("SELECT otp, created_at FROM signup_otps WHERE email = ?", (email,))
        otp_row = cur.fetchone()
        if not otp_row:
            return {"error": "Please request a verification code for this email first."}, 400
        
        stored_otp, created_at = otp_row
        if int(time()) - created_at > 600: # 10 mins expiry
            return {"error": "The verification code has expired. Please request a new one."}, 400
            
        if stored_otp != otp_code:
            return {"error": "The verification code is incorrect."}, 400

        cur.execute("SELECT * FROM users WHERE email=?", (email,))
        existing_user = cur.fetchone()
        if existing_user:
            return {"error" : "Email address is already registered"}, 409
            
        con.execute(
            "INSERT INTO users(first_name, last_name, email, password, date_of_birth, created_at) VALUES(?, ?, ?, ?, ?, ?)",
            (first_name, last_name, email, hashed_password, date_of_birth, int(time()))
        )
        
        # Codes are single-use after successful signup.
        con.execute("DELETE FROM signup_otps WHERE email = ?", (email,))

    return {"message" : "User registered successfully."}, 201

@app.route('/login', methods=['POST'])
@limiter.limit("10 per minute")  #Brute-force protection
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return {"error": "Email address and password are required"}, 400

    email = data.get('email').strip().lower()
        
    with sqlite3.connect("database.db") as con:
        cur = con.cursor()
        cur.execute("SELECT first_name, last_name, password FROM users WHERE email=?", (email,))
        user_row = cur.fetchone()

    if user_row and check_password_hash(user_row[2], data['password']):
        token = jwt.encode({
            'user': email,
            'exp': int(time()) + 3600  #5 mins expiry
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return {
            "message" : "Welcome",
            "token": token,
            "user": {
                "firstName": user_row[0],
                "lastName": user_row[1],
                "email": email
            }
        }
        
    return {"error" : "Wrong email address or password"}, 401

@app.route('/api/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    email_error = validate_email(email)
    if email_error:
        return {"error": email_error}, 400

    # to send name 
    with sqlite3.connect("database.db") as con:
        cur = con.cursor()
        cur.execute("SELECT first_name FROM users WHERE email=?", (email,))
        user_row = cur.fetchone()

    if not user_row:
        return {"message": "If this email is registered, a password reset link has been sent."}, 200

    first_name = user_row[0]
    token = uuid.uuid4().hex
    expires_at = int(time()) + 900 # 15 minutes

    # Store one active reset token per account.
    with sqlite3.connect("database.db") as con:
        con.execute(
            "INSERT OR REPLACE INTO password_resets(email, token, expires_at) VALUES(?, ?, ?)",
            (email, token, expires_at)
        )

    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_password = os.getenv('SMTP_PASSWORD')
    frontend_url = get_frontend_url()
    if not smtp_email or not smtp_password:
        return {"error": "Email service is not configured on the backend env."}, 500

    subject = "Reset Your Password - AirShare"
    
    # Reuse the same email as OTP/share emails.
    logo_data = None
    try:
        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static/airshare-logo.png'))
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as f:
                logo_data = f.read()
    except Exception as e:
        print(f"Error loading logo: {e}")

    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = smtp_email
    msg['To'] = email

    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)

    if logo_data:
        logo_html = '<img src="cid:logo_img" alt="AirShare" style="max-width: 120px; height: auto; margin-bottom: 15px; display: block;">'
    else:
        logo_html = '<h2 style="color: #3b82f6; margin-top: 0;">AirShare</h2>'

    reset_url = f"{frontend_url}/reset-password/{token}"
    # The token stays in the link; the frontend removes it after verification.
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      {logo_html}
      <h3 style="color: #111827; margin-top: 0;">Reset Your Password</h3>
      <p>Hello {first_name},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <p style="margin: 25px 0;">
        <a href="{reset_url}" style="display: inline-block; background: #3b82f6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; margin: 0;">This reset link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    """
    msg_alternative.attach(MIMEText(html_content, 'html'))

    if logo_data:
        try:
            mime_img = MIMEImage(logo_data)
            mime_img.add_header('Content-ID', '<logo_img>')
            mime_img.add_header('Content-Disposition', 'inline', filename='airshare-logo.png')
            msg.attach(mime_img)
        except Exception as e:
            print(f"Error attaching logo: {e}")

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, [email], msg.as_string())
        return {"message": "If this email is registered, a password reset link has been sent."}, 200
    except Exception as e:
        print(f"SMTP Error sending password reset: {e}")
        return {"error": "Failed to send verification email. Please try again later."}, 500

@app.route('/api/verify-reset-token/<token>', methods=['GET'])
def verify_reset_token(token):
    # Frontend calls this before showing the new password form.
    with sqlite3.connect("database.db") as con:
        cur = con.cursor()
        cur.execute("SELECT email, expires_at FROM password_resets WHERE token=?", (token,))
        row = cur.fetchone()

        if not row:
            return {"error": "Invalid or expired reset link."}, 400

        email, expires_at = row
        if int(time()) > expires_at:
            con.execute("DELETE FROM password_resets WHERE token=?", (token,))
            return {"error": "This reset link has expired. Please request a new password reset link."}, 400

    return {"message": "Token is valid"}, 200

@app.route('/api/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    # Token and password are submitted together after link verification.
    data = request.get_json() or {}
    token = data.get('token')
    password = data.get('password')

    if not token or not password:
        return {"error": "Token and password are required"}, 400

    password_error = validate_password(password)
    if password_error:
        return {"error": password_error}, 400

    with sqlite3.connect("database.db") as con:
        cur = con.cursor()
        cur.execute("SELECT email, expires_at FROM password_resets WHERE token=?", (token,))
        row = cur.fetchone()

        if not row:
            return {"error": "Invalid or expired reset link."}, 400

        email, expires_at = row
        if int(time()) > expires_at:
            con.execute("DELETE FROM password_resets WHERE token=?", (token,))
            return {"error": "This reset link has expired. Please request a new password reset link."}, 400

        # Avoid resetting to the same password.
        cur.execute("SELECT password FROM users WHERE email=?", (email,))
        user_row = cur.fetchone()
        if user_row and check_password_hash(user_row[0], password):
            return {"error": "New password must be different from your current password."}, 400

        hashed_password = generate_password_hash(password)
        con.execute("UPDATE users SET password=? WHERE email=?", (hashed_password, email))
        # Reset tokens are single-use.
        con.execute("DELETE FROM password_resets WHERE email=?", (email,))

    return {"message": "Password reset successfully. You can now log in with your new password."}, 200

# Shared rate-limit response.
@app.errorhandler(429)
def ratelimit_handler(e):
    return {"error" : "Too many requests. Please wait a minute before trying again."}, 429

# Refresh keeps active sessions alive without a new login.
@app.route('/refresh', methods=['POST'])
@require_auth_token
def refresh_token(authenticated_user):
    # Replace the current token so stolen old tokens cannot keep working.
    auth_header = request.headers.get('Authorization')
    old_token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    
    with sqlite3.connect("database.db") as con:
        con.execute("INSERT INTO blacklist VALUES(?)", (old_token,))
    
    new_token = jwt.encode({
        'user': authenticated_user,
        'exp': int(time()) + 3600
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return {"message" : "Token refreshed successfully", "token" : new_token}

# Save uploads with UUID names and keep original names in metadata.
@app.route('/upload', methods=['POST'])
@require_auth_token
def upload_file(authenticated_user):
    # Accept both single-file and multi-file form keys.
    files_to_upload = []
    
    if "files" in request.files:
        files_to_upload = request.files.getlist("files")
    elif "file" in request.files:
        files_to_upload = [request.files["file"]]
    
    if not files_to_upload or (len(files_to_upload) == 1 and files_to_upload[0].filename == ''):
        return {"error" : "No valid files provided"}, 400
    
    # Storage is counted from file metadata for this owner.
    try:
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute("SELECT COALESCE(SUM(size), 0) FROM file_map WHERE owner_email = ?", (authenticated_user,))
            current_storage = cur.fetchone()[0] or 0
    except Exception:
        return {"error" : "Failed to check storage"}, 500
    
    # Calculate total size of files to upload
    total_upload_size = 0
    for file in files_to_upload:
        # Measure from the stream, then rewind before later checks.
        file.stream.seek(0, os.SEEK_END)
        total_upload_size += file.stream.tell()
        file.stream.seek(0)
    
    # Check the full batch before saving anything.
    if current_storage + total_upload_size > app.config['MAX_STORAGE_PER_USER']:
        max_storage_gb = app.config['MAX_STORAGE_PER_USER'] / (1024 * 1024 * 1024)
        return {"error" : f"Storage limit exceeded. Maximum {max_storage_gb}GB per user."}, 413
    
    # Save each file under a generated name to avoid collisions.
    uploaded_files = []
    errors = []
    upload_dir = app.config['UPLOADED_FILES_DEST']

    for file in files_to_upload:
        try:
            # Individual files stay capped at 100MB.
            file.stream.seek(0, os.SEEK_END)
            file_size = file.stream.tell()
            file.stream.seek(0)
            
            if file_size > 100 * 1024 * 1024:
                errors.append(f"{file.filename}: File size exceeds 100MB limit")
                continue

            file_id = str(uuid.uuid4())
            extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            
            if not verify_file_content(file.stream, extension):
                errors.append(f"{file.filename}: Content does not match extension rules")
                continue

            # Upload only after VirusTotal returns a clean scan.
            is_safe, scan_msg = scan_file_virustotal(file.stream)
            if not is_safe:
                errors.append(f"{file.filename}: {scan_msg}")
                continue

            stored_name = f"{file_id}.{extension}" if extension else file_id
            saved_filename = user_files.save(file, name=stored_name)
            saved_path = os.path.join(upload_dir, saved_filename)
            file_size = os.path.getsize(saved_path)
            uploaded_at = int(time())

            # Metadata keeps the original name while disk storage stays UUID-based.
            with sqlite3.connect("database.db") as con:
                con.execute(
                    "INSERT INTO file_map(id, owner_email, original_name, stored_name, size, uploaded_at) VALUES(?, ?, ?, ?, ?, ?)",
                    (file_id, authenticated_user, file.filename, saved_filename, file_size, uploaded_at)
                )

            uploaded_files.append({
                "id": file_id,
                "original_name": file.filename,
                "download_link": f"{request.host_url}download/{file_id}"
            })
        except Exception:
            errors.append(f"{file.filename}: Invalid file format")
    
    if not uploaded_files:
        if errors:
            return {"error": "; ".join(errors)}, 400
        return {"error" : "Invalid file format. Please upload pdf, png, jpg, jpeg, txt, docx, mp4, mov, or mkv."}, 400
    
    response = {
        "message" : f"Uploaded {len(uploaded_files)} file{'s' if len(uploaded_files) != 1 else ''}",
        "uploaded_files": uploaded_files
    }
    
    if errors:
        response["warnings"] = errors
    
    return response, 201


# Owner-only download endpoint.
@app.route('/download/<file_id>', methods=['GET'])
@require_auth_token
def download_file(authenticated_user, file_id):
    try:
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT stored_name, original_name FROM file_map WHERE id = ? AND owner_email = ?",
                (file_id, authenticated_user)
            )
            row = cur.fetchone()

        if not row:
            return {"error" : "File not found."}, 404

        stored_name, original_name = row
        file_path = os.path.join(app.config['UPLOADED_FILES_DEST'], stored_name)
        if not os.path.exists(file_path):
            return {"error" : "File not accessible."}, 404

        return send_from_directory(
            app.config['UPLOADED_FILES_DEST'],
            stored_name,
            as_attachment=True,
            download_name=original_name
        )
    except Exception:
        return {"error" : "Failed to download file."}, 500

# Delete one owned file and its share links.
@app.route('/delete/<file_id>', methods=['DELETE'])
@require_auth_token
def delete_file(authenticated_user, file_id):
    try:
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT stored_name FROM file_map WHERE id = ? AND owner_email = ?",
                (file_id, authenticated_user)
            )
            row = cur.fetchone()

        if not row:
            return {"error" : "File not found."}, 404

        stored_name = row[0]
        file_path = os.path.join(app.config['UPLOADED_FILES_DEST'], stored_name)
        if os.path.exists(file_path):
            os.remove(file_path)

        with sqlite3.connect("database.db") as con:
            con.execute("DELETE FROM share_links WHERE file_id = ?", (file_id,))
            con.execute("DELETE FROM file_map WHERE id = ?", (file_id,))

        return {"message" : "File deleted successfully."}, 200
    except Exception:
        return {"error" : "Failed to delete file."}, 500

# Delete all files for the current user.
@app.route('/files/all', methods=['DELETE'])
@require_auth_token
def delete_all_files(authenticated_user):
    try:
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT id, stored_name FROM file_map WHERE owner_email = ?",
                (authenticated_user,)
            )
            rows = cur.fetchall()

        if not rows:
            return {"message": "No files to delete.", "deleted": 0}, 200

        deleted_count = 0
        for file_id, stored_name in rows:
            file_path = os.path.join(app.config['UPLOADED_FILES_DEST'], stored_name)
            if os.path.exists(file_path):
                os.remove(file_path)
            deleted_count += 1

        with sqlite3.connect("database.db") as con:
            con.execute("DELETE FROM share_links WHERE file_id IN (SELECT id FROM file_map WHERE owner_email = ?)", (authenticated_user,))
            con.execute("DELETE FROM file_map WHERE owner_email = ?", (authenticated_user,))

        return {"message": f"All {deleted_count} file(s) deleted successfully.", "deleted": deleted_count}, 200
    except Exception:
        return {"error": "Failed to delete all files."}, 500

# List files owned by the current user.
@app.route('/files', methods=['GET'])
@require_auth_token
def list_user_files(authenticated_user):
    try:
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT id, original_name, stored_name, size, uploaded_at FROM file_map WHERE owner_email = ? ORDER BY uploaded_at DESC",
                (authenticated_user,)
            )
            rows = cur.fetchall()

        user_files_list = []
        upload_dir = app.config['UPLOADED_FILES_DEST']
        for row in rows:
            # Mark missing disk files instead of hiding metadata silently.
            stored_name = row[2]
            file_path = os.path.join(upload_dir, stored_name)
            accessible = os.path.exists(file_path)
            user_files_list.append({
                "id": row[0],
                "original_name": row[1],
                "size": row[3] if accessible else 0,
                "uploaded_at": row[4],
                "accessible": accessible,
                "download_link": f"{request.host_url}download/{row[0]}" if accessible else None
            })

        return {"files": user_files_list}, 200
    except Exception:
        return {"error": "Failed to retrieve files"}, 500

# Email helper for share links.
def send_share_email(recipient_email, sender_name, share_url, file_name, expires_at):
    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_password = os.getenv('SMTP_PASSWORD')
    if not smtp_email or not smtp_password:
        return False

    # Show recipients a readable expiry time.
    try:
        expires_datetime = datetime.fromtimestamp(expires_at)
        formatted_expiry = expires_datetime.strftime("%B %d, %Y at %I:%M %p")
    except Exception:
        formatted_expiry = "unknown time"

    # Attempt to load the logo image
    logo_data = None
    try:
        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static/airshare-logo.png'))
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as f:
                logo_data = f.read()
    except Exception as e:
        print(f"Error loading logo: {e}")

    subject = f"{sender_name} shared a file with you via AirShare"

    # Related MIME lets the logo render inline.
    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = smtp_email
    msg['To'] = recipient_email

    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)

    if logo_data:
        logo_html = '<img src="cid:logo_img" alt="AirShare" style="max-width: 120px; height: auto; margin-bottom: 15px; display: block;">'
    else:
        logo_html = '<h2 style="color: #3b82f6; margin-top: 0;">AirShare</h2>'

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      {logo_html}
      <p><strong>{sender_name}</strong> has shared a file:</p>
      <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-weight: bold; word-break: break-all;">{file_name}</p>
      <p style="margin: 20px 0;"><a href="{share_url}" style="display: inline-block; background: #3b82f6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View & Download File</a></p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #666; margin: 0;">This link expires on <span style="color: #ef4444; font-weight: bold;">{formatted_expiry}</span>.</p>
    </div>
    """

    msg_alternative.attach(MIMEText(html_content, 'html'))

    if logo_data:
        try:
            mime_img = MIMEImage(logo_data)
            mime_img.add_header('Content-ID', '<logo_img>')
            mime_img.add_header('Content-Disposition', 'inline', filename='airshare-logo.png')
            msg.attach(mime_img)
        except Exception as e:
            print(f"Error attaching logo: {e}")

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, [recipient_email], msg.as_string())
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False

@app.route('/share', methods=['POST'])
@require_auth_token
def create_share_link(authenticated_user):
    # A share link belongs to one file and one recipient email.
    data = request.get_json() or {}
    file_id = data.get('fileId') or data.get('file_id')
    recipient_email = (data.get('recipientEmail') or data.get('recipient_email') or '').strip().lower()
    expires_in_hours = int(data.get('expiresInHours', 72)) if data.get('expiresInHours') else 72

    if not file_id:
        return {"error": "File id is required."}, 400
    email_error = validate_email(recipient_email)
    if email_error:
        return {"error": email_error}, 400

    with sqlite3.connect('database.db') as con:
        cur = con.cursor()
        cur.execute(
            "SELECT original_name FROM file_map WHERE id = ? AND owner_email = ?",
            (file_id, authenticated_user)
        )
        row = cur.fetchone()

        if not row:
            return {"error": "File not found or you do not have permission to share it."}, 404

        file_name = row[0]

        # Retrieve sender's first and last name from users table
        cur.execute(
            "SELECT first_name, last_name FROM users WHERE email = ?",
            (authenticated_user,)
        )
        user_row = cur.fetchone()
        sender_display_name = f"{user_row[0]} {user_row[1]}" if user_row else authenticated_user

        token = uuid.uuid4().hex
        created_at = int(time())
        expires_at = created_at + expires_in_hours * 3600

        # Persist the token before emailing it.
        con.execute(
            "INSERT INTO share_links(token, file_id, owner_email, recipient_email, created_at, expires_at) VALUES(?, ?, ?, ?, ?, ?)",
            (token, file_id, authenticated_user, recipient_email, created_at, expires_at)
        )

    frontend_url = get_frontend_url()
    share_url = f"{frontend_url}/share/{token}"
    send_share_email(recipient_email, sender_display_name, share_url, file_name, expires_at)

    return {
        "message": "Share link created successfully.",
        "share": {
            "token": token,
            "fileId": file_id,
            "recipientEmail": recipient_email,
            "shareUrl": share_url,
            "expiresAt": expires_at,
            "createdAt": created_at,
            "accessCount": 0,
            "status": "active"
        }
    }, 201

@app.route('/shares', methods=['GET'])
@require_auth_token
def list_share_links(authenticated_user):
    # Owners see all links they created, newest first.
    try:
        with sqlite3.connect('database.db') as con:
            cur = con.cursor()
            cur.execute(
                "SELECT sl.token, sl.file_id, fm.original_name, sl.recipient_email, sl.created_at, sl.expires_at, sl.access_count, sl.last_accessed_at, sl.status "
                "FROM share_links sl "
                "LEFT JOIN file_map fm ON sl.file_id = fm.id "
                "WHERE sl.owner_email = ? ORDER BY sl.created_at DESC",
                (authenticated_user,)
            )
            rows = cur.fetchall()

            frontend_url = get_frontend_url()
            share_links = []
            for token, file_id, original_name, recipient_email, created_at, expires_at, access_count, last_accessed_at, status in rows:
                share_links.append({
                    "token": token,
                    "fileId": file_id,
                    "fileName": original_name or "Deleted File",
                    "recipientEmail": recipient_email,
                    "createdAt": created_at,
                    "expiresAt": expires_at,
                    "accessCount": access_count,
                    "lastAccessedAt": last_accessed_at,
                    "status": status,
                    "shareUrl": f"{frontend_url}/share/{token}"
                })

        return {"shareLinks": share_links}, 200
    except Exception:
        return {"error": "Failed to retrieve share links."}, 500

@app.route('/share/info/<token>', methods=['GET'])
@limiter.limit("30 per minute")
def public_share_info(token):
    # Lightweight metadata endpoint used before preview/download.
    try:
        with sqlite3.connect('database.db') as con:
            cur = con.cursor()
            cur.execute(
                "SELECT file_id, expires_at, status "
                "FROM share_links WHERE token = ?",
                (token,)
            )
            row = cur.fetchone()

            if not row:
                return {"error": "Shared file not found."}, 404

            file_id, expires_at, status = row
            current_time = int(time())
            if status != 'active':
                return {"error": "This share link is no longer active."}, 410
            if expires_at and current_time > expires_at:
                return {"error": "The shared link has expired."}, 410

            cur.execute(
                "SELECT original_name, size FROM file_map WHERE id = ?",
                (file_id,)
            )
            file_row = cur.fetchone()

            if not file_row:
                return {"error": "File not found."}, 404

            original_name, size = file_row
            ext = os.path.splitext(original_name)[1].lower()
            if ext.startswith('.'):
                ext = ext[1:]

        return {
            "filename": original_name,
            "size": size,
            "extension": ext,
            "expiresAt": expires_at
        }, 200
    except Exception:
        return {"error": "Failed to retrieve share info."}, 500

@app.route('/share/<token>', methods=['GET'])
@limiter.limit("30 per minute")
def public_share_download(token):
    # Public downloads are guarded by token, status, and expiry.
    try:
        with sqlite3.connect('database.db') as con:
            cur = con.cursor()
            cur.execute(
                "SELECT file_id, recipient_email, expires_at, access_count, last_accessed_at, status "
                "FROM share_links WHERE token = ?",
                (token,)
            )
            row = cur.fetchone()

            if not row:
                return {"error": "Shared file not found."}, 404

            file_id, recipient_email, expires_at, access_count, last_accessed_at, status = row
            current_time = int(time())
            if status != 'active':
                return {"error": "This share link is no longer active."}, 410
            if expires_at and current_time > expires_at:
                return {"error": "The shared link has expired."}, 410

            cur.execute(
                "SELECT stored_name, original_name FROM file_map WHERE id = ?",
                (file_id,)
            )
            file_row = cur.fetchone()

            if not file_row:
                return {"error": "File not found."}, 404

            stored_name, original_name = file_row
            file_path = os.path.join(app.config['UPLOADED_FILES_DEST'], stored_name)
            if not os.path.exists(file_path):
                return {"error": "File not accessible."}, 404

            cur.execute(
                "UPDATE share_links SET access_count = access_count + 1, last_accessed_at = ? WHERE token = ?",
                (current_time, token)
            )
            con.commit()

        as_download = request.args.get('download') == '1'
        return send_from_directory(
            app.config['UPLOADED_FILES_DEST'],
            stored_name,
            as_attachment=as_download,
            download_name=original_name
        )
    except Exception:
        return {"error": "Failed to retrieve shared file."}, 500

@app.route('/share/<token>', methods=['DELETE'])
@require_auth_token
def delete_share_link(authenticated_user, token):
    # Owners can revoke a share link at any time.
    try:
        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT token FROM share_links WHERE token = ? AND owner_email = ?",
                (token, authenticated_user)
            )
            row = cur.fetchone()

            if not row:
                return {"error": "Share link not found or permission denied."}, 404

            con.execute("DELETE FROM share_links WHERE token = ?", (token,))
            con.commit()

        return {"message": "Share link deleted successfully."}, 200
    except Exception:
        return {"error": "Failed to delete share link."}, 500

@app.errorhandler(413)
def file_too_large(e):
    return {"error" : "File exceeds the 100MB limit. Please upload a smaller file."}, 413

# Dashboard storage summary.
@app.route('/user/stats', methods=['GET'])
@require_auth_token
def get_user_stats(authenticated_user):
    try:
        upload_dir = app.config['UPLOADED_FILES_DEST']
        total_storage = 0
        file_count = 0

        with sqlite3.connect("database.db") as con:
            cur = con.cursor()
            cur.execute(
                "SELECT stored_name, size FROM file_map WHERE owner_email = ?",
                (authenticated_user,)
            )
            for stored_name, size in cur.fetchall():
                file_path = os.path.join(upload_dir, stored_name)
                if os.path.exists(file_path):
                    total_storage += size
                    file_count += 1

        storage_mb = round(total_storage / (1024 * 1024), 2)

        return {
            "storage_used_mb": storage_mb,
            "file_count": file_count
        }, 200
    except Exception:
        return {"error": "Failed to retrieve user stats"}, 500

@app.route('/')
def home():
    return "Flask Backend"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
