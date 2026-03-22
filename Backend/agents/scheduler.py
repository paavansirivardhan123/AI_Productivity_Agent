import os
import json
import datetime
import re
from typing import List
import dateparser

# Required for OAuth2 token exchange over HTTP (localhost dev)
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

from pydantic import BaseModel, Field, ValidationError

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow, Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ============================================================
# CONFIG
# ============================================================
TIMEZONE = "Asia/Kolkata"
MODEL = "llama-3.1-8b-instant"

# ============================================================
# Pydantic Models (SOURCE OF TRUTH)
# ============================================================
class ExtractedContext(BaseModel):
    start_date: str | None = Field(
        default=None,
        description="Raw date phrase from user, if any"
    )
    duration_days: int
    tasks: List[str]
    email: str | None = None
    gap_days: int = 1


class DailyTask(BaseModel):
    title: str
    start_time: str
    end_time: str


class Schedule(BaseModel):
    days: int
    daily_template: List[DailyTask]


# ============================================================
# GOOGLE CALENDAR — per-user token management
# ============================================================
SCOPES = ["https://www.googleapis.com/auth/calendar"]

def _workspace_root() -> str:
    """Returns the absolute path to the workspace root (two levels above Backend/agents/)."""
    agents_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(agents_dir)
    return os.path.dirname(backend_dir)

def _creds_path() -> str:
    return os.path.join(_workspace_root(), "credentials.json")

def _build_flow(redirect_uri: str, scopes: list = None) -> Flow:
    """Build an OAuth flow that works with both 'installed' and 'web' credential types."""
    import json as _json
    if scopes is None:
        scopes = SCOPES
    with open(_creds_path()) as f:
        client_config = _json.load(f)

    if "installed" in client_config:
        info = client_config["installed"]
        web_config = {
            "web": {
                "client_id": info["client_id"],
                "client_secret": info["client_secret"],
                "auth_uri": info.get("auth_uri", "https://accounts.google.com/o/oauth2/auth"),
                "token_uri": info.get("token_uri", "https://oauth2.googleapis.com/token"),
                "redirect_uris": [redirect_uri],
            }
        }
        flow = Flow.from_client_config(web_config, scopes=scopes)
    else:
        flow = Flow.from_client_secrets_file(_creds_path(), scopes=scopes)

    flow.redirect_uri = redirect_uri
    return flow


def get_oauth_url(user_id: str, redirect_uri: str) -> str:
    """Generate a Google OAuth consent URL for the given user."""
    flow = _build_flow(redirect_uri)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=user_id,
    )
    return auth_url


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange an OAuth authorization code for tokens. Returns creds as dict."""
    flow = _build_flow(redirect_uri)
    flow.fetch_token(code=code)
    return json.loads(flow.credentials.to_json())

def get_calendar_service_for_user(user_id: str):
    """
    Build a Google Calendar service for a specific user.
    Loads their tokens from DB, refreshes if expired.
    Raises RuntimeError if user has not authorized yet.
    """
    from db_manager import Store
    import json as _json

    token_data = Store.get_google_token(user_id)
    if not token_data:
        raise RuntimeError("NOT_AUTHORIZED")

    # Fall back to credentials.json for client_id/secret if not stored in DB
    client_id = token_data.get("client_id")
    client_secret = token_data.get("client_secret")
    if not client_id or not client_secret:
        try:
            with open(_creds_path()) as f:
                creds_file = _json.load(f)
            info = creds_file.get("installed") or creds_file.get("web") or {}
            client_id = client_id or info.get("client_id")
            client_secret = client_secret or info.get("client_secret")
        except Exception:
            pass

    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=client_id,
        client_secret=client_secret,
        scopes=token_data.get("scopes", SCOPES),
    )

    # Handle expiry string → datetime
    if token_data.get("expiry"):
        try:
            expiry_str = token_data["expiry"].replace("Z", "+00:00")
            creds.expiry = datetime.datetime.fromisoformat(expiry_str).replace(tzinfo=None)
        except Exception:
            pass

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Persist refreshed token back to DB
            Store.save_google_token(user_id, _json.loads(creds.to_json()))
        else:
            raise RuntimeError("NOT_AUTHORIZED")

    return build("calendar", "v3", credentials=creds)

# Keep the old single-token function for backward compat (used by calendar_auth.py)
def get_calendar_service():
    """Legacy single-token calendar service (workspace root token.json)."""
    token_path = os.path.join(_workspace_root(), "token.json")
    creds_path = _creds_path()

    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        else:
            raise RuntimeError(
                "Google Calendar is not authorized yet. "
                "Run: .venv/Scripts/python.exe Backend/agents/calendar_auth.py"
            )
    return build("calendar", "v3", credentials=creds)


# ============================================================
# 2️⃣ DATE NORMALIZATION
# ============================================================
import calendar

def resolve_start_date(date_text: str) -> datetime.date:
    today = datetime.date.today()
    text = date_text.lower()

    # 1️⃣ Explicit "this month" handling ONLY
    ordinal_match = re.search(r"\b(\d{1,2})(st|nd|rd|th)\b", text)
    if ordinal_match and "this month" in text:
        day = int(ordinal_match.group(1))
        year = today.year
        month = today.month

        last_day = calendar.monthrange(year, month)[1]
        return datetime.date(year, month, min(day, last_day))

    # 2️⃣ Everything else → dateparser (next month, last month, etc.)
    settings = {
        "PREFER_DATES_FROM": "future",
        "RELATIVE_BASE": datetime.datetime.now(),
        "TIMEZONE": "Asia/Kolkata",
        "RETURN_AS_TIMEZONE_AWARE": False,
    }

    parsed = dateparser.parse(date_text, settings=settings)

    if not parsed:
        raise ValueError(f"Could not parse date: {date_text}")

    return parsed.date()

# ============================================================
# 2️⃣ CONTEXT EXTRACTION (STRICT + SAFE)
# ============================================================
def extract_context(user_request: str) -> ExtractedContext:
    parser = PydanticOutputParser(pydantic_object=ExtractedContext)

    @tool
    def search(query: str) -> str:
        """
        - Search the topic mentioned in the query 
        - For that topic find the subtopics which is modern and up-to-date make sure to include the latest information about that topic 
        - Make sure no duplicate subtopics are included

        Output  Return only list of subtopics Unique 
            list of subtopics 
        """
        return DuckDuckGoSearchRun().invoke(query)

    tools = [search]
    
    llm = ChatGroq(model=MODEL, temperature=0).bind_tools(tools)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """

            You are a STRICT information extraction engine.

            Your job is to extract ONLY information that is EXPLICITLY present
            in the user request and output it as valid JSON.

            IMPORTANT:
            - You must NOT interpret dates
            - You must NOT normalize dates
            - You must NOT guess missing values
            - You must NOT invent defaults
            - You must NOT change wording
            - You must NOT explain anything

            -------------------------
            DATE HANDLING (CRITICAL):
            -------------------------
            If the user mentions a date or time reference:
            - Extract the RAW PHRASE exactly as the user said it
            - Do NOT convert it to a calendar date
            - Do NOT convert it to ISO format
            - Examples of valid raw date phrases:
            - "7th of this month"
            - "10th of next month"
            - "next monday"
            - "today"
            - "tomorrow"
            - "in 3 days"
            - "last week"

            If the user does NOT mention any date:
            - Set start_date to null

            -------------------------
            DURATION RULES:
            -------------------------
            - Extract duration ONLY if explicitly mentioned
            - Duration must be a number of days
            - If duration is not mentioned, set duration_days to 1

            -------------------------
            SEARCH & TASK RULES:
            -------------------------
            1. If the user provides a broad topic (e.g., "Python", "LangChain"), you MUST use the search tool.
            2. Search for a `{{topic}} syllabus for {{duration_days}} days`.
            3. Populate the 'tasks' field with a list of SHORT, CONCISE sub-topic titles extracted from search results.
            4. IMPORTANT: Each task must be a simple TITLE (e.g. "Variables and Data Types"), NOT a paragraph, and NOT containing dates or snippets.

            -------------------------
            EMAIL RULES:
            -------------------------
            - Extract email only if explicitly present
            - Otherwise set email to null

            -------------------------
            GAP DAYS:
            -------------------------
            - Extract gap_days only if explicitly present
            - Otherwise set gap_days to 1

            -------------------------
            OUTPUT RULES (MANDATORY):
            -------------------------
            - Output ONLY valid JSON
            - No markdown
            - No comments
            - No explanations
            - No extra text
            
            -------------------------
            SCHEMA:
            -------------------------
            {{
                "start_date": string | null,
                "duration_days": number,
                "tasks": [string],
                "email": string | null,
                "gap_days": number
            }}
        """),
        ("human", "{input}")
    ])
    
    messages = prompt.format_messages(input=user_request)
    last_error = None

    for attempt in range(3):
        try:
            # Multi-turn tool execution loop
            turn = 0
            while turn < 5: 
                response = llm.invoke(messages)
                
                if not response.tool_calls:
                    break # Final response
                
                messages.append(response)
                for tool_call in response.tool_calls:
                    if tool_call['name'] == 'search':
                        print(f"🔍 Executing search: {tool_call['args']}")
                        tool_result = search.invoke(tool_call['args'])
                        messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call['id']))
                    else:
                        messages.append(ToolMessage(content="Error: Tool not found", tool_call_id=tool_call['id']))
                
                turn += 1
            
            # Parse final response
            context: ExtractedContext = parser.parse(response.content)

            # HARD VALIDATION
            if context.duration_days <= 0:
                raise ValueError("duration_days must be >= 1")

            if not context.tasks:
                raise ValueError("At least one task is required")

            if context.gap_days < 1:
                context.gap_days = 1

            if context.start_date is None:
                context.start_date = "today"

            return context

        except Exception as e:
            last_error = e
            print(f"⚠️ Context extraction attempt {attempt + 1} failed: {e}")
            messages = prompt.format_messages(input=user_request)

    raise ValueError(f"Context extraction failed: {last_error}")

# ============================================================
# 3️⃣ SCHEDULER (NO JSON.LOADS, PARSER ONLY)
# ============================================================
def generate_schedule(context: ExtractedContext) -> Schedule:
    parser = PydanticOutputParser(pydantic_object=Schedule)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """
                You are a SCHEDULER.

                Your job is to generate a day-wise learning plan.

                ABSOLUTE RULES (MUST FOLLOW):
                - You MUST generate EXACTLY `days` number of entries in `daily_template`
                - `len(daily_template)` MUST be EQUAL to `days`
                - There must be ONE task per day
                - You are NOT allowed to return fewer or more items

                TASK RULES:
                - Use the provided tasks to create a schedule
                - You MAY rephrase tasks to make them concise and professional TITLES (3-6 words)
                - Do NOT invent completely new topics, but you can clean up the wording
                - If tasks are fewer than days, REPEAT tasks in order
                - If tasks are more than days, USE only the first `days` tasks

                TIME RULES:
                - Use realistic study blocks (1–3 hours)
                - Use HH:MM 24-hour format
                - Times may repeat across days

                OUTPUT RULES:
                - Output ONLY valid JSON
                - No markdown
                - No explanations
                - No comments
                - No extra text

                SCHEMA (MANDATORY):
                {{
                "days": number,
                "daily_template": [
                    {{
                    "title": string,
                    "start_time": "HH:MM",
                    "end_time": "HH:MM"
                    }}
                ]
                }}

        """),
        ("human", "{input}")
    ])

    llm = ChatGroq(model=MODEL, temperature=0)
    chain = prompt | llm.with_structured_output(Schedule)

    return chain.invoke({
        "input": f"Days: {context.duration_days}\nTasks: {context.tasks}"
    })


# ============================================================
# 4️⃣ CALENDAR EVENT CREATION
# ============================================================
def create_calendar_events(schedule: Schedule, context: ExtractedContext, user_id: str = None):
    if len(schedule.daily_template) != schedule.days:
        raise ValueError(
            f"Schedule mismatch: expected {schedule.days}, "
            f"got {len(schedule.daily_template)}"
        )

    # Always use per-user service — no fallback to shared token ever
    if not user_id:
        raise ValueError("user_id is required for calendar event creation")
    service = get_calendar_service_for_user(user_id)
    start_date = resolve_start_date(context.start_date)

    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    event_links = []

    for day_offset in range(schedule.days):
        current_date = start_date + datetime.timedelta(
            days=day_offset * context.gap_days
        )

        task = schedule.daily_template[day_offset]

        start_dt = datetime.datetime.combine(
            current_date,
            datetime.datetime.strptime(task.start_time, "%H:%M").time(),
            tzinfo=ist
        )

        end_dt = datetime.datetime.combine(
            current_date,
            datetime.datetime.strptime(task.end_time, "%H:%M").time(),
            tzinfo=ist
        )

        event = {
            "summary": task.title,
            "description": task.title,
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": TIMEZONE
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": TIMEZONE
            }
        }

        if context.email:
            event["attendees"] = [{"email": context.email}]

        created_event = service.events().insert(
            calendarId="primary",
            body=event,
            sendUpdates="all"
        ).execute()

        event_links.append(created_event.get("htmlLink"))

        print(f"✅ Created: {task.title} on {current_date}")

    return event_links


def delete_all_future_events():
    service = get_calendar_service()

    now = datetime.datetime.utcnow().isoformat() + "Z"

    events_result = service.events().list(
        calendarId="primary",
        timeMin=now,
        singleEvents=True
    ).execute()

    events = events_result.get("items", [])

    for event in events:
        service.events().delete(
            calendarId="primary",
            eventId=event["id"]
        ).execute()

        print(f"❌ Deleted: {event.get('summary', 'No Title')}")
