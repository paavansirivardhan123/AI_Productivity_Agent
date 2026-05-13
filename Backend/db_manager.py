import sqlite3
import json
import os
import bcrypt
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "app_database.db")


def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables if they don't exist. Never drops existing data."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        email TEXT UNIQUE,
                        role TEXT,
                        subscription TEXT,
                        createdAt TEXT,
                        password_hash TEXT
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS chats (
                        id TEXT PRIMARY KEY,
                        ownerUserId TEXT,
                        data TEXT,
                        FOREIGN KEY(ownerUserId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS schedules (
                        id TEXT PRIMARY KEY,
                        ownerUserId TEXT,
                        data TEXT,
                        FOREIGN KEY(ownerUserId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS agent_outputs (
                        id TEXT PRIMARY KEY,
                        ownerUserId TEXT,
                        data TEXT,
                        createdAt TEXT,
                        FOREIGN KEY(ownerUserId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS activity_logs (
                        id TEXT PRIMARY KEY,
                        userId TEXT,
                        action TEXT,
                        timestamp TEXT,
                        duration_sec INTEGER,
                        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS sessions (
                        token TEXT PRIMARY KEY,
                        userId TEXT,
                        createdAt TEXT,
                        expiresAt TEXT,
                        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS documents (
                        id TEXT PRIMARY KEY,
                        ownerUserId TEXT,
                        data TEXT,
                        FOREIGN KEY(ownerUserId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS google_tokens (
                        userId TEXT PRIMARY KEY,
                        access_token TEXT,
                        refresh_token TEXT,
                        token_uri TEXT,
                        client_id TEXT,
                        client_secret TEXT,
                        scopes TEXT,
                        expiry TEXT,
                        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
                      )''')

    # Ensure UploadedFiles and vector_store directories exist
    uploads_dir = os.path.join(BASE_DIR, "UploadedFiles")
    vector_store_dir = os.path.join(BASE_DIR, "vector_store")
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(vector_store_dir, exist_ok=True)

    # Seed default accounts only if they don't already exist
    _seed_default_users(cursor)

    conn.commit()
    conn.close()


def _seed_default_users(cursor):
    """Insert default admin only if no users exist at all."""
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        return  # DB already has users, don't touch anything

    # Create root admin if not exists
    cursor.execute("SELECT * FROM users WHERE email = 'paavansirivardhan_admin@gmail.com'")
    admin = cursor.fetchone()
    if not admin:
        import bcrypt
        default_hash = bcrypt.hashpw(b"1234567", bcrypt.gensalt()).decode()
        cursor.execute('''INSERT INTO users 
            (id, name, email, role, subscription, createdAt, password_hash) 
            VALUES (?, ?, ?, ?, ?, ?, ?)''',
            ("admin-001", "Admin", "paavansirivardhan_admin@gmail.com", "admin", "premium", datetime.now().isoformat(), default_hash))



# Initialize tables on import (safe — never drops data)
init_db()


class Store:
    """SQLite wrapper abstracting the persistence layer."""

    @classmethod
    def track_activity(cls, user_id, action, duration=0):
        import uuid
        conn = get_db()
        conn.cursor().execute(
            '''INSERT INTO activity_logs (id, userId, action, timestamp, duration_sec) VALUES (?, ?, ?, ?, ?)''',
            (str(uuid.uuid4()), user_id, action, datetime.now().isoformat(), duration)
        )
        conn.commit()
        conn.close()

    # ── Chats ──────────────────────────────────────────────────────────────

    @classmethod
    def save_chat(cls, chat_id, data, user_id=None):
        if user_id:
            data["ownerUserId"] = user_id
        conn = get_db()
        conn.cursor().execute(
            '''INSERT INTO chats (id, ownerUserId, data) VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET data=excluded.data''',
            (chat_id, user_id, json.dumps(data))
        )
        conn.commit()
        conn.close()
        return data

    @classmethod
    def get_chats(cls, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT data FROM chats WHERE ownerUserId=?", (user_id,))
        else:
            cursor.execute("SELECT data FROM chats")
        rows = [json.loads(row[0]) for row in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def get_chat(cls, chat_id, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT data FROM chats WHERE id=? AND ownerUserId=?", (chat_id, user_id))
        else:
            cursor.execute("SELECT data FROM chats WHERE id=?", (chat_id,))
        row = cursor.fetchone()
        conn.close()
        return json.loads(row[0]) if row else None

    @classmethod
    def delete_chat(cls, chat_id, user_id=None):
        conn = get_db()
        if user_id:
            conn.cursor().execute("DELETE FROM chats WHERE id=? AND ownerUserId=?", (chat_id, user_id))
        else:
            conn.cursor().execute("DELETE FROM chats WHERE id=?", (chat_id,))
        conn.commit()
        conn.close()

    # ── Schedules ──────────────────────────────────────────────────────────

    @classmethod
    def save_schedule(cls, schedule_id, data, user_id=None):
        if user_id:
            data["ownerUserId"] = user_id
        conn = get_db()
        conn.cursor().execute(
            '''INSERT INTO schedules (id, ownerUserId, data) VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET data=excluded.data''',
            (schedule_id, user_id, json.dumps(data))
        )
        conn.commit()
        conn.close()
        return data

    @classmethod
    def get_schedule(cls, schedule_id, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT data FROM schedules WHERE id=? AND ownerUserId=?", (schedule_id, user_id))
        else:
            cursor.execute("SELECT data FROM schedules WHERE id=?", (schedule_id,))
        row = cursor.fetchone()
        conn.close()
        return json.loads(row[0]) if row else None

    @classmethod
    def get_schedules(cls, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT data FROM schedules WHERE ownerUserId=?", (user_id,))
        else:
            cursor.execute("SELECT data FROM schedules")
        rows = [json.loads(row[0]) for row in cursor.fetchall()]
        conn.close()
        return rows

    # ── Documents ──────────────────────────────────────────────────────────

    @classmethod
    def save_document(cls, doc_id, data, user_id=None):
        if user_id:
            data["ownerUserId"] = user_id
        conn = get_db()
        conn.cursor().execute(
            '''INSERT INTO documents (id, ownerUserId, data) VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET data=excluded.data''',
            (doc_id, user_id, json.dumps(data))
        )
        conn.commit()
        conn.close()
        return data

    @classmethod
    def get_documents(cls, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT data FROM documents WHERE ownerUserId=?", (user_id,))
        else:
            cursor.execute("SELECT data FROM documents")
        rows = [json.loads(row[0]) for row in cursor.fetchall()]
        conn.close()
        return rows

    @classmethod
    def get_document(cls, doc_id, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT data FROM documents WHERE id=? AND ownerUserId=?", (doc_id, user_id))
        else:
            cursor.execute("SELECT data FROM documents WHERE id=?", (doc_id,))
        row = cursor.fetchone()
        conn.close()
        return json.loads(row[0]) if row else None

    # ── Users ──────────────────────────────────────────────────────────────

    @classmethod
    def get_users(cls):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        users = []
        for row in cursor.fetchall():
            u = dict(row)
            u.pop("password_hash", None)
            users.append(u)
        conn.close()
        return users

    @classmethod
    def get_user_by_email(cls, email):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email=?", (email,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    def get_user_by_id(cls, user_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id=?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    def save_user(cls, user_id, data):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id=?", (user_id,))
        exists = cursor.fetchone()
        pw_hash = data.get("password_hash", "")
        if exists:
            if pw_hash:
                cursor.execute(
                    '''UPDATE users SET name=?, email=?, role=?, subscription=?, password_hash=? WHERE id=?''',
                    (data.get("name"), data.get("email"), data.get("role"), data.get("subscription"), pw_hash, user_id)
                )
            else:
                cursor.execute(
                    '''UPDATE users SET name=?, email=?, role=?, subscription=? WHERE id=?''',
                    (data.get("name"), data.get("email"), data.get("role"), data.get("subscription"), user_id)
                )
        else:
            cursor.execute(
                '''INSERT INTO users (id, name, email, role, subscription, createdAt, password_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (user_id, data.get("name"), data.get("email"), data.get("role", "user"),
                 data.get("subscription", "free"), datetime.now().isoformat(), pw_hash)
            )
        conn.commit()
        conn.close()
        data.pop("password_hash", None)
        return data

    @classmethod
    def delete_user(cls, user_id):
        conn = get_db()
        conn.cursor().execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()
        conn.close()

    # ── Sessions ───────────────────────────────────────────────────────────

    @classmethod
    def create_session(cls, token, user_id, expires_at=None):
        conn = get_db()
        conn.cursor().execute(
            "INSERT OR REPLACE INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)",
            (token, user_id, datetime.now().isoformat(), expires_at),
        )
        conn.commit()
        conn.close()

    @classmethod
    def get_session(cls, token):
        conn = get_db()
        row = conn.cursor().execute("SELECT * FROM sessions WHERE token=?", (token,)).fetchone()
        conn.close()
        return dict(row) if row else None

    @classmethod
    def delete_session(cls, token):
        conn = get_db()
        conn.cursor().execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
        conn.close()

    @classmethod
    def clear_user_sessions(cls, user_id):
        conn = get_db()
        conn.cursor().execute("DELETE FROM sessions WHERE userId=?", (user_id,))
        conn.commit()
        conn.close()

    @classmethod
    def count_active_sessions(cls):
        conn = get_db()
        row = conn.cursor().execute("SELECT COUNT(*) as c FROM sessions").fetchone()
        conn.close()
        return row[0] if row else 0

    # ── Google OAuth Tokens ────────────────────────────────────────────────

    @classmethod
    def save_google_token(cls, user_id: str, creds_json: dict):
        import json
        conn = get_db()
        # google-auth to_json() uses "token" for access_token; handle both keys
        access_token = creds_json.get("token") or creds_json.get("access_token")
        conn.cursor().execute(
            '''INSERT INTO google_tokens (userId, access_token, refresh_token, token_uri, client_id, client_secret, scopes, expiry)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(userId) DO UPDATE SET
                 access_token=excluded.access_token,
                 refresh_token=COALESCE(excluded.refresh_token, google_tokens.refresh_token),
                 token_uri=excluded.token_uri,
                 client_id=excluded.client_id,
                 client_secret=excluded.client_secret,
                 scopes=excluded.scopes,
                 expiry=excluded.expiry''',
            (
                user_id,
                access_token,
                creds_json.get("refresh_token"),
                creds_json.get("token_uri"),
                creds_json.get("client_id"),
                creds_json.get("client_secret"),
                json.dumps(creds_json.get("scopes", [])),
                creds_json.get("expiry"),
            )
        )
        conn.commit()
        conn.close()

    @classmethod
    def get_google_token(cls, user_id: str) -> dict | None:
        import json
        conn = get_db()
        row = conn.cursor().execute(
            "SELECT * FROM google_tokens WHERE userId=?", (user_id,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        r = dict(row)
        return {
            "token": r["access_token"],
            "refresh_token": r["refresh_token"],
            "token_uri": r["token_uri"],
            "client_id": r["client_id"],
            "client_secret": r["client_secret"],
            "scopes": json.loads(r["scopes"] or "[]"),
            "expiry": r["expiry"],
        }

    @classmethod
    def delete_google_token(cls, user_id: str):
        conn = get_db()
        conn.cursor().execute("DELETE FROM google_tokens WHERE userId=?", (user_id,))
        conn.commit()
        conn.close()

    # ── Activity Logs ──────────────────────────────────────────────────────

    @classmethod
    def get_activity_logs(cls, user_id=None):
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT * FROM activity_logs WHERE userId=? ORDER BY timestamp DESC", (user_id,))
        else:
            cursor.execute("SELECT * FROM activity_logs ORDER BY timestamp DESC")
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return logs
