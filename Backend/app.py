import sqlite3, jwt, re, os, uuid
from flask import Flask, request, send_from_directory
from flask_cors import CORS
from time import time
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask_uploads import UploadSet, configure_uploads
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:5174", "http://127.0.0.1:5174",
            "http://localhost:5176", "http://127.0.0.1:5176",
            "http://localhost:5177", "http://127.0.0.1:5177"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
#Fetching the secret key, Set it in your .env file
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['UPLOADED_FILES_DEST'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100*1024*1024 #100MB limit for uploads
app.config['MAX_STORAGE_PER_USER'] = 1*1024*1024*1024  # 1 GB limit per user


def init_database():
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
    default_limits=["200 per day", "50 per hour"],
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
    return None


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

        # Delete all files belonging to the user before deleting the account
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
                    # Continue deleting other files even if one fails
                    pass
        except Exception:
            # Continue with account deletion even if file deletion fails
            pass

        with sqlite3.connect("database.db") as con:
            # Delete user record, user files metadata, and invalidate their current token
            con.execute("DELETE FROM file_map WHERE owner_email = ?", (authenticated_user,))
            con.execute("DELETE FROM users WHERE email = ?", (authenticated_user,))
            con.execute("INSERT INTO blacklist(token) VALUES(?)", (token_to_delete,))

        return {"message" : "Account deleted successfully."}

#Creates a new user
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    required_fields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'dateOfBirth']
    if not data or any(not data.get(field) for field in required_fields):
        return {"error" : "All registration fields are required"}, 400

    first_name = data.get('firstName').strip()
    last_name = data.get('lastName').strip()
    email = data.get('email').strip().lower()
    password = data.get('password')
    confirm_password = data.get('confirmPassword')
    date_of_birth = data.get('dateOfBirth').strip()

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

        cur.execute("SELECT * FROM users WHERE email=?", (email,))
        existing_user = cur.fetchone()
        if existing_user:
            return {"error" : "Email address is already registered"}, 409
            
        con.execute(
            "INSERT INTO users(first_name, last_name, email, password, date_of_birth, created_at) VALUES(?, ?, ?, ?, ?, ?)",
            (first_name, last_name, email, hashed_password, date_of_birth, int(time()))
        )

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

#Rate-limited requests 
@app.errorhandler(429)
def ratelimit_handler(e):
    return {"error" : "Too many requests. Please wait a minute before trying again."}, 429

#Blacklists the old token and issues a fresh one for the user
@app.route('/refresh', methods=['POST'])
@require_auth_token
def refresh_token(authenticated_user):
    auth_header = request.headers.get('Authorization')
    old_token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    
    with sqlite3.connect("database.db") as con:
        con.execute("INSERT INTO blacklist VALUES(?)", (old_token,))
    
    new_token = jwt.encode({
        'user': authenticated_user,
        'exp': int(time()) + 3600 #5 mins validity
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return {"message" : "Token refreshed successfully", "token" : new_token}

#Uploads files and links them to the authenticated user's ID
@app.route('/upload', methods=['POST'])
@require_auth_token
def upload_file(authenticated_user):
    # Handle both single file ("file") and multiple files ("files")
    files_to_upload = []
    
    if "files" in request.files:
        files_to_upload = request.files.getlist("files")
    elif "file" in request.files:
        files_to_upload = [request.files["file"]]
    
    if not files_to_upload or (len(files_to_upload) == 1 and files_to_upload[0].filename == ''):
        return {"error" : "No valid files provided"}, 400
    
    # Calculate user's current storage using mapped file metadata
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
        file.stream.seek(0, os.SEEK_END)
        total_upload_size += file.stream.tell()
        file.stream.seek(0)
    
    # Check if adding these files would exceed the limit
    if current_storage + total_upload_size > app.config['MAX_STORAGE_PER_USER']:
        max_storage_gb = app.config['MAX_STORAGE_PER_USER'] / (1024 * 1024 * 1024)
        return {"error" : f"Storage limit exceeded. Maximum {max_storage_gb}GB per user."}, 413
    
    # Save files using UUID-backed storage names
    uploaded_files = []
    errors = []
    upload_dir = app.config['UPLOADED_FILES_DEST']

    for file in files_to_upload:
        try:
            file_id = str(uuid.uuid4())
            extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            stored_name = f"{file_id}.{extension}" if extension else file_id
            saved_filename = user_files.save(file, name=stored_name)
            saved_path = os.path.join(upload_dir, saved_filename)
            file_size = os.path.getsize(saved_path)
            uploaded_at = int(time())

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
        return {"error" : "Invalid file format. Please upload pdf, png, jpg, jpeg, txt, docx, mp4, mov, or mkv."}, 400
    
    response = {
        "message" : f"Uploaded {len(uploaded_files)} file{'s' if len(uploaded_files) != 1 else ''}",
        "uploaded_files": uploaded_files
    }
    
    if errors:
        response["warnings"] = errors
    
    return response, 201


#Gives files only to the owners who uploaded them
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

#Delete a file - only by the owner
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
            con.execute("DELETE FROM file_map WHERE id = ?", (file_id,))

        return {"message" : "File deleted successfully."}, 200
    except Exception:
        return {"error" : "Failed to delete file."}, 500

#List user's uploaded files
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

@app.errorhandler(413)
def file_too_large(e):
    return {"error" : "File exceeds the 100MB limit. Please upload a smaller file."}, 413

#Get user storage statistics
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
    app.run(debug=True)
