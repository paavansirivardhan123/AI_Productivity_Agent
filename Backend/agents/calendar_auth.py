"""
One-time Google Calendar OAuth setup.
Run this ONCE from the workspace root before starting the server:

    .venv/Scripts/python.exe Backend/agents/calendar_auth.py

This opens a browser, asks you to sign in with your Google account,
and saves token.json so the server can sync calendars without interaction.
"""
import os
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/calendar"]

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # workspace root
creds_path = os.path.join(base_dir, "credentials.json")
token_path = os.path.join(base_dir, "token.json")

if not os.path.exists(creds_path):
    print(f"ERROR: credentials.json not found at {creds_path}")
    exit(1)

flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
creds = flow.run_local_server(port=0)

with open(token_path, "w") as f:
    f.write(creds.to_json())

print(f"\n✅ Authorization complete! token.json saved to: {token_path}")
print("You can now start the backend server and use Google Calendar sync.")
