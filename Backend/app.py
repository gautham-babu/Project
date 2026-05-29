import sqlite3, jwt, re, os
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


def get_file_owner_prefix(email):
    email_name = email.split("@", 1)[0]
    return re.sub(r"[^a-zA-Z0-9_]", "_", email_name.lower())

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
            all_files = os.listdir(upload_dir)
            
            owner_prefix = get_file_owner_prefix(authenticated_user)
            files_deleted = 0
            for filename in all_files:
                if filename.startswith(f"{owner_prefix}.") or filename.startswith(f"{owner_prefix}_"):
                    file_path = os.path.join(upload_dir, filename)
                    try:
                        os.remove(file_path)
                        files_deleted += 1
                    except OSError:
                        # Continue deleting other files even if one fails
                        pass
            
        except Exception:
            # Continue with account deletion even if file deletion fails
            pass
            
        with sqlite3.connect("database.db") as con:
            #Delete user record and invalidate their current token
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
    
    # Calculate user's current storage
    try:
        upload_dir = app.config['UPLOADED_FILES_DEST']
        all_files = os.listdir(upload_dir)
        owner_prefix = get_file_owner_prefix(authenticated_user)
        
        current_storage = 0
        for filename in all_files:
            if filename.startswith(f"{owner_prefix}.") or filename.startswith(f"{owner_prefix}_"):
                file_path = os.path.join(upload_dir, filename)
                current_storage += os.path.getsize(file_path)
    except Exception:
        return {"error" : "Failed to check storage"}, 500
    
    # Calculate total size of files to upload
    total_upload_size = 0
    for file in files_to_upload:
        file.seek(0, 2)  # Seek to end
        total_upload_size += file.tell()
        file.seek(0)  # Reset to beginning
    
    # Check if adding these files would exceed the limit
    if current_storage + total_upload_size > app.config['MAX_STORAGE_PER_USER']:
        max_storage_gb = app.config['MAX_STORAGE_PER_USER'] / (1024 * 1024 * 1024)
        return {"error" : f"Storage limit exceeded. Maximum {max_storage_gb}GB per user."}, 413
    
    # Save files
    uploaded_files = []
    errors = []
    
    for file in files_to_upload:
        try:
            saved_filename = user_files.save(file, name=f"{get_file_owner_prefix(authenticated_user)}.")
            uploaded_files.append({
                "filename": saved_filename,
                "download_link": f"{request.host_url}download/{saved_filename}"
            })
        except Exception as e:
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
@app.route('/download/<filename>', methods=['GET'])
@require_auth_token
def download_file(authenticated_user, filename):
    owner_prefix = get_file_owner_prefix(authenticated_user)
    if not (filename.startswith(f"{owner_prefix}.") or filename.startswith(f"{owner_prefix}_")):
        return {"error" : "Unauthorized. You can only download your own files."}, 403

    #Send the file from the destination folder
    return send_from_directory(app.config['UPLOADED_FILES_DEST'], filename, as_attachment=True)

#Delete a file - only by the owner
@app.route('/delete/<filename>', methods=['DELETE'])
@require_auth_token
def delete_file(authenticated_user, filename):
    #Ensure they only delete their own files
    owner_prefix = get_file_owner_prefix(authenticated_user)
    if not (filename.startswith(f"{owner_prefix}.") or filename.startswith(f"{owner_prefix}_")):
        return {"error" : "Unauthorized. You can only delete your own files."}, 403
    
    try:
        file_path = os.path.join(app.config['UPLOADED_FILES_DEST'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"message" : "File deleted successfully."}, 200
        else:
            return {"error" : "File not found."}, 404
    except Exception as e:
        return {"error" : "Failed to delete file."}, 500

#List user's uploaded files
@app.route('/files', methods=['GET'])
@require_auth_token
def list_user_files(authenticated_user):
    try:
        upload_dir = app.config['UPLOADED_FILES_DEST']
        all_files = os.listdir(upload_dir)
        owner_prefix = get_file_owner_prefix(authenticated_user)
        
        # Filter files that belong to the authenticated user
        user_files_list = []
        for filename in all_files:
            # Check if file belongs to the authenticated user's safe file prefix
            if filename.startswith(f"{owner_prefix}.") or filename.startswith(f"{owner_prefix}_"):
                file_path = os.path.join(upload_dir, filename)
                file_stat = os.stat(file_path)
                
                # Extract original filename - currently this is the stored filename
                if filename.startswith(f"{owner_prefix}."):
                    # First file: gautham.pdf -> original: pdf (but we want full extension)
                    original_name = filename
                else:
                    # Numbered files: gautham_1.pdf -> extract original extension
                    original_name = filename
                    
                user_files_list.append({
                    "filename": filename,
                    "original_name": filename,  # For now, show the full filename
                    "size": file_stat.st_size,
                    "uploaded_at": file_stat.st_mtime
                })
        
        # Sort by upload time (most recent first)
        user_files_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
        
        return {"files": user_files_list}, 200
    except Exception as e:
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
        all_files = os.listdir(upload_dir)
        owner_prefix = get_file_owner_prefix(authenticated_user)
        
        total_storage = 0
        file_count = 0
        
        # Calculate storage and count for user's files
        for filename in all_files:
            if filename.startswith(f"{owner_prefix}.") or filename.startswith(f"{owner_prefix}_"):
                file_path = os.path.join(upload_dir, filename)
                file_stat = os.stat(file_path)
                total_storage += file_stat.st_size
                file_count += 1
        
        # Convert bytes to MB
        storage_mb = round(total_storage / (1024 * 1024), 2)
        
        return {
            "storage_used_mb": storage_mb,
            "file_count": file_count
        }, 200
    except Exception as e:
        return {"error": "Failed to retrieve user stats"}, 500

@app.errorhandler(413)
def file_too_large(e):
    return {"error" : "File exceeds the 100MB limit. Please upload a smaller file."}, 413

@app.route('/')
def home():
    return "Flask Backend"

if __name__ == '__main__':
    app.run(debug=True)
