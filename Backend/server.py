import os
import uuid
import datetime
import re
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# Import existing logic
from agents.scheduler import extract_context, generate_schedule as run_scheduler, resolve_start_date
from pyFiles.doc import doc_info

app = FastAPI(title="AI Productivity Agent API")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )

# Enable CORS for frontend
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db_manager import Store

security = HTTPBearer()
local_schedule_cache = {} # Caches raw Schedule objects for calendar sync functionality

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    session = Store.get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    if session.get("expiresAt"):
        expiresAt = datetime.datetime.fromisoformat(session["expiresAt"])
        # Handle offset-naive vs offset-aware comparison
        now = datetime.datetime.now(datetime.timezone.utc)
        if expiresAt.tzinfo is None:
            expiresAt = expiresAt.replace(tzinfo=datetime.timezone.utc)
            
        if now > expiresAt:
            Store.delete_session(token)
            raise HTTPException(status_code=401, detail="Session expired")

    user = Store.get_user_by_id(session["userId"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found in DB")

    return {"uid": user["id"], "email": user["email"], "role": user["role"], "subscription": user.get("subscription")}

def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# --- Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: Optional[str] = None
    email: str
    password: str

class ChatCreateRequest(BaseModel):
    id: Optional[str] = None
    title: str

class MessageRequest(BaseModel):
    role: str
    content: str
    tokensUsed: Optional[int] = 0

class MessageUpdateRequest(BaseModel):
    content: str

class QuestionRequest(BaseModel):
    documentId: str
    question: str

# --- Routes ---

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = Store.get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Check credentials or register.")

    if not user.get("password_hash") or not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = f"auth-{uuid.uuid4()}"
    expires_at = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
    Store.create_session(token, user["id"], expires_at)

    Store.track_activity(user["id"], "Login")

    sanitized_user = user.copy()
    sanitized_user.pop("password_hash", None)
    # Add subscriptionType field for frontend compatibility
    sanitized_user["subscriptionType"] = sanitized_user.get("subscription", "free")

    return {"token": token, "user": sanitized_user}


@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Re-fetch user from DB to get latest data
    u = Store.get_user_by_id(user["uid"])
    if not u:
        raise HTTPException(status_code=401, detail="User no longer exists")
    
    sanitized_user = u.copy()
    sanitized_user.pop("password_hash", None)
    sanitized_user["subscriptionType"] = sanitized_user.get("subscription", "free")
    return {"user": sanitized_user}


@app.post("/api/login")
async def login_alias(req: LoginRequest):
    return await login(req)


@app.get("/api/schedules")
async def get_schedules_endpoint(user: dict = Depends(get_current_user)):
    return {"schedules": Store.get_schedules(user_id=user["uid"])}

@app.get("/api/documents")
async def get_documents_endpoint(user: dict = Depends(get_current_user)):
    return {"documents": Store.get_documents(user_id=user["uid"])}

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    existing = Store.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user-{uuid.uuid4()}"
    display_name = (req.name or req.email.split("@")[0]).strip().capitalize()

    Store.save_user(user_id, {
        "name": display_name,
        "email": req.email,
        "role": "user",
        "subscription": "free",
        "password_hash": hashed_password,
    })

    Store.track_activity(user_id, "Registration")

    # Auto-login after registration
    return await login(LoginRequest(email=req.email, password=req.password))


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None


@app.patch("/api/auth/profile")
async def update_profile(req: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    u = Store.get_user_by_id(user["uid"])
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if req.name:
        u["name"] = req.name.strip()
    Store.save_user(user["uid"], u)
    u.pop("password_hash", None)
    u["subscriptionType"] = u.get("subscription", "free")
    return {"user": u}



@app.post("/api/auth/logout")
async def logout(user: dict = Depends(get_current_user), credentials: HTTPAuthorizationCredentials = Depends(security)):
    Store.delete_session(credentials.credentials)
    Store.track_activity(user["uid"], "Logout")
    return {"status": "logged_out"}

@app.post("/api/signup")
async def signup_alias(req: RegisterRequest):
    return await register(req)

@app.get("/api/chats")
async def get_chats_endpoint(user: dict = Depends(get_current_user)):
    return {"chats": Store.get_chats(user_id=user["uid"])}

@app.post("/api/chats")
async def create_chat(req: ChatCreateRequest, user: dict = Depends(get_current_user)):
    chat_id = req.id or str(uuid.uuid4())
    new_chat = {
        "id": chat_id,
        "title": req.title,
        "messages": [],
        "updatedAt": datetime.datetime.now().isoformat()
    }
    Store.save_chat(chat_id, new_chat, user_id=user["uid"])
    return new_chat

@app.post("/api/chats/sync")
async def sync_chat(req: dict, user: dict = Depends(get_current_user)):
    # Simple sync to allow frontend to push local chats
    chat_id = req.get("id")
    if not chat_id:
        raise HTTPException(status_code=400, detail="Missing chat id")
    Store.save_chat(chat_id, req, user_id=user["uid"])
    return {"status": "success"}

@app.get("/api/chats/{chat_id}")
async def get_chat_endpoint(chat_id: str, user: dict = Depends(get_current_user)):
    chat = Store.get_chat(chat_id, user_id=user["uid"])
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.post("/api/chats/{chat_id}/messages")
async def add_message(chat_id: str, req: MessageRequest, user: dict = Depends(get_current_user)):
    chat = Store.get_chat(chat_id, user_id=user["uid"])
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    message = {
        "id": str(uuid.uuid4()),
        "role": req.role,
        "content": req.content,
        "timestamp": datetime.datetime.now().isoformat(),
        "tokensUsed": req.tokensUsed
    }
    chat["messages"].append(message)
    chat["updatedAt"] = datetime.datetime.now().isoformat()
    Store.save_chat(chat_id, chat, user_id=user["uid"])
    return message

@app.delete("/api/chats/{chat_id}")
async def delete_chat_endpoint(chat_id: str, user: dict = Depends(get_current_user)):
    Store.delete_chat(chat_id, user_id=user["uid"])
    return {"status": "success"}

@app.patch("/api/chats/{chat_id}/messages/{message_id}")
async def update_chat_message(chat_id: str, message_id: str, req: MessageUpdateRequest, user: dict = Depends(get_current_user)):
    chat = Store.get_chat(chat_id, user_id=user["uid"])
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    for msg in chat["messages"]:
        if msg["id"] == message_id:
            msg["content"] = req.content
            Store.save_chat(chat_id, chat, user_id=user["uid"])
            return msg
    raise HTTPException(status_code=404, detail="Message not found")

@app.delete("/api/chats/{chat_id}/messages/{message_id}")
async def delete_chat_message(chat_id: str, message_id: str, user: dict = Depends(get_current_user)):
    chat = Store.get_chat(chat_id, user_id=user["uid"])
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat["messages"] = [m for m in chat["messages"] if m["id"] != message_id]
    Store.save_chat(chat_id, chat, user_id=user["uid"])
    return {"status": "success"}

@app.post("/api/ai/chat")
async def ai_chat(
    chatId: str = Query(...), 
    message: str = Form(...), 
    file: Optional[UploadFile] = File(None),
    agent: str = Form("chat"),
    user: dict = Depends(get_current_user)
):
    try:
        from agents.agent_chain import (
            chat_chain, 
            code_chain, 
            writer_chain, 
            final_chain
        )
        from agents.scheduler import extract_context, generate_schedule
        
        from langchain_core.runnables import RunnableLambda
        
        # Normalize agent parameter (lowercase, strip whitespace)
        agent = agent.lower().strip() if agent else "chat"
        
        # Mapping agents to their chains - matches agent_chain + server scheduler
        def _scheduler_invoke(x):
            query = x.get("input", "")
            try:
                ctx = extract_context(query)
                sched = generate_schedule(ctx)
                lines = [f"### Schedule ({ctx.duration_days} days)"]
                for i, t in enumerate(sched.daily_template):
                    lines.append(f"- Day {i + 1}: {t.start_time}-{t.end_time} | {t.title}")
                return "\n".join(lines)
            except Exception as ex:
                return f"Could not create schedule: {str(ex)}"

        scheduler_chain = RunnableLambda(_scheduler_invoke)
        agent_map = {
            "chat": chat_chain,
            "code": code_chain,
            "writer": writer_chain,
            "scheduler": scheduler_chain,
            "auto": final_chain
        }
        
        # If a file is uploaded, we no longer override the agent parameter
        if file and not agent:
            agent = "chat"
        
        selected_chain = agent_map.get(agent, chat_chain)
        print(f"🤖 Using agent: '{agent}'")
        
        context_prepend = ""

        if file:
            os.makedirs("UploadedFiles", exist_ok=True)
            safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", Path(file.filename).name)
            file_path = os.path.join("UploadedFiles", f"{uuid.uuid4()}_{safe_name}")
            with open(file_path, "wb") as f:
                f.write(await file.read())
            
            # Fetch content directly from document vector store using doc_info
            try:
                doc_context = doc_info(message, pdf_path=file_path, user_id=user["uid"])
                context_prepend = f"[Document Context (from {safe_name}):\n{doc_context}]\n\n"
            except Exception as e:
                print(f"Failed to extract document context: {e}")
                context_prepend = f"[Document: {safe_name} attached, but extracting failed.] "
                
        # If user is admin/super_admin, inject system context for DB queries
        if user.get("role") in ["admin", "super_admin"]:
            context_prepend += "\n[SYSTEM INSTRUCTION: You are speaking to an Admin user. If they ask about platform users, stats, or activity, use your `admin_db_query` tool to retrieve data from the application database before responding.]\n\n"
        
        # Invoke chain
        try:
            # Inject user_id into the input for tools to use if needed
            chain_input = {
                "input": context_prepend + message,
                "user_id": user["uid"],
                "user_role": user["role"]
            }
            response = selected_chain.invoke(chain_input)
        except Exception as invoke_err:
            print(f"⚠️ Chain invocation failed: {str(invoke_err)}")
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            
            fallback_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.7)
            fallback_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a helpful assistant. Provide clear and concise answers. Refer to provided Document Context if any."),
                ("human", "{input}")
            ])
            fallback_chain = fallback_prompt | fallback_llm
            resp = fallback_chain.invoke({"input": context_prepend + message})
            response = resp.content if hasattr(resp, "content") else str(resp)
        
        # Ensure response is a string
        if not isinstance(response, str):
            response = str(response)
        
        # Track usage in database
        tokens_used = len(response.split()) + len(message.split())
        Store.track_activity(user["uid"], f"AI Request ({agent})")
        
        return {
            "content": response, 
            "tokensUsed": tokens_used
        }
    except Exception as e:
        import traceback
        print("❌ CRITICAL BACKEND ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/scheduler")
async def ai_scheduler(data: dict, user: dict = Depends(get_current_user)):
    goal = data.get("goal") or "study plan"
    duration = data.get("duration_days") or "7"
    
    # Construct exact string format that worked in main.py
    full_request = f"I Want to learn {goal} for {duration} days"
    
    try:
        context = extract_context(full_request)
        
        # Override with explicit data if provided by frontend
        if "duration_days" in data:
            try:
                context.duration_days = int(data["duration_days"])
            except: pass
        if "start_date" in data and data["start_date"]:
            context.start_date = data["start_date"]
        if "gap_days" in data:
            try:
                context.gap_days = int(data["gap_days"])
            except: pass
            
        schedule = run_scheduler(context)
        
        daily_plans = []
        start_date = resolve_start_date(context.start_date)
        
        for i, task in enumerate(schedule.daily_template):
            current_date = (start_date + datetime.timedelta(days=i * context.gap_days)).isoformat()
            
            # Calculate duration for frontend display
            duration_mins = 60
            try:
                fmt = "%H:%M"
                tdelta = datetime.datetime.strptime(task.end_time, fmt) - datetime.datetime.strptime(task.start_time, fmt)
                duration_mins = int(tdelta.total_seconds() / 60)
                if duration_mins <= 0: duration_mins = 60
            except:
                pass
                
            daily_plans.append({
                "date": current_date,
                "tasks": [{
                    "id": str(uuid.uuid4()),
                    "time": task.start_time,
                    "title": task.title,
                    "duration": duration_mins
                }]
            })
            
        # Calculate end date accounting for gaps
        total_duration_days = (len(daily_plans) - 1) * context.gap_days if daily_plans else 0
        end_date = start_date + datetime.timedelta(days=total_duration_days)
        
        result = {
            "id": str(uuid.uuid4()),
            "userId": user["uid"],
            "title": f"Schedule for {goal}",
            "goal": goal,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dailyPlans": daily_plans
        }
        
        # Store for internal features (like calendar sync)
        schedule_data = {
            **result,
            # For Firebase compatibility, omit complex custom objects or convert them to dict
            # "raw_context" and "raw_schedule" are kept for the in-memory fallback inside Store
        }
        Store.save_schedule(result["id"], schedule_data, user_id=user["uid"])
        
        # Keep raw objects in memory for calendar sync as DB can't serialize them easily
        local_schedule_cache[result["id"]] = {
            **result,
            "raw_context": context,
            "raw_schedule": schedule
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    # Ensure directory exists
    os.makedirs("UploadedFiles", exist_ok=True)
    # Save file to UploadedFiles
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", Path(file.filename).name)
    file_path = os.path.join("UploadedFiles", f"{uuid.uuid4()}_{safe_name}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    doc_data = {"id": doc_id, "name": safe_name, "path": file_path}
    Store.save_document(doc_id, doc_data, user_id=user["uid"])
    return {"documentId": doc_id, "name": safe_name}

@app.post("/api/ai/document/question")
async def document_question(req: QuestionRequest, user: dict = Depends(get_current_user)):
    try:
        doc = Store.get_document(req.documentId, user_id=user["uid"])
        pdf_path = doc["path"] if doc else None
        answer = doc_info(req.question, pdf_path=pdf_path, user_id=user["uid"])
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/document/summarize")
async def document_summarize(data: dict, user: dict = Depends(get_current_user)):
    document_id = data.get("documentId")
    try:
        doc = Store.get_document(document_id, user_id=user["uid"])
        pdf_path = doc["path"] if doc else None
        summary = doc_info("Summarize this document in 3-5 sentences.", pdf_path=pdf_path, user_id=user["uid"])
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/document/notes")
async def document_notes(data: dict, user: dict = Depends(get_current_user)):
    document_id = data.get("documentId")
    try:
        doc = Store.get_document(document_id, user_id=user["uid"])
        pdf_path = doc["path"] if doc else None
        notes = doc_info("Generate detailed study notes for this document with bullet points.", pdf_path=pdf_path, user_id=user["uid"])
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/model-usage")
async def admin_model_usage(admin: dict = Depends(require_admin)):
    """Returns per-agent usage counts and per-user breakdown."""
    logs = Store.get_activity_logs()
    agent_counts = {}
    user_agent_map = {}  # user_id -> {agent: count}

    for log in logs:
        action = log.get("action", "")
        # Match "AI Request (chat)", "AI Request (code)", etc.
        if action.startswith("AI Request"):
            import re
            m = re.search(r"\((\w+)\)", action)
            agent = m.group(1) if m else "chat"
            agent_counts[agent] = agent_counts.get(agent, 0) + 1
            uid = log.get("userId", "unknown")
            if uid not in user_agent_map:
                user_agent_map[uid] = {}
            user_agent_map[uid][agent] = user_agent_map[uid].get(agent, 0) + 1

    # Enrich with user names
    users = {u["id"]: u for u in Store.get_users()}
    per_user = []
    for uid, agents in user_agent_map.items():
        u = users.get(uid, {})
        per_user.append({
            "userId": uid,
            "name": u.get("name", uid),
            "email": u.get("email", ""),
            "subscription": u.get("subscription", "free"),
            "agents": agents,
            "total": sum(agents.values()),
        })
    per_user.sort(key=lambda x: x["total"], reverse=True)

    return {
        "agentCounts": agent_counts,
        "perUser": per_user,
    }


@app.get("/api/admin/user-details")
async def admin_user_details(admin: dict = Depends(require_admin)):
    """Returns users enriched with their chat/schedule/document counts."""
    users = Store.get_users()
    result = []
    for u in users:
        uid = u["id"]
        chats = Store.get_chats(user_id=uid)
        schedules = Store.get_schedules(user_id=uid)
        documents = Store.get_documents(user_id=uid)
        logs = Store.get_activity_logs(user_id=uid)
        last_active = logs[0]["timestamp"] if logs else None
        result.append({
            **u,
            "chatCount": len(chats),
            "scheduleCount": len(schedules),
            "documentCount": len(documents),
            "activityCount": len(logs),
            "lastActive": last_active,
        })
    return {"users": result}

@app.get("/api/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    users_list = Store.get_users()
    premium_count = len([u for u in users_list if u.get("subscription") == "premium"])
    return {
        "totalUsers": len(users_list),
        "premiumUsers": premium_count,
        "activeSessions": Store.count_active_sessions(),
        "revenueMTD": premium_count * 10
    }

@app.get("/api/admin/usage-trends")
async def usage_trends(admin: dict = Depends(require_admin)):
    logs = Store.get_activity_logs()
    # Group logs by date and count actions
    trends = {}
    for log in logs:
        date = log["timestamp"][:10]
        if date not in trends:
            trends[date] = {"date": date, "chats": 0, "schedules": 0, "documents": 0}
        
        action = log["action"].lower()
        if "chat" in action or "ai request" in action:
            trends[date]["chats"] += 1
        elif "schedule" in action:
            trends[date]["schedules"] += 1
        elif "document" in action or "upload" in action:
            trends[date]["documents"] += 1
            
    # Convert to list and sort by date
    result = sorted(trends.values(), key=lambda x: x["date"], reverse=True)[:7]
    return result

@app.get("/api/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    return {"users": Store.get_users()}

@app.post("/api/schedules/{schedule_id}/sync/calendar")
async def sync_calendar(schedule_id: str, user: dict = Depends(get_current_user)):
    sched_data = local_schedule_cache.get(schedule_id)
    if not sched_data:
        sched_data = Store.get_schedule(schedule_id, user_id=user["uid"])
    if not sched_data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    try:
        from agents.scheduler import create_calendar_events, ExtractedContext, Schedule, DailyTask

        # If raw objects are in memory (same server session), use them directly
        if "raw_schedule" in sched_data and "raw_context" in sched_data:
            raw_context = sched_data["raw_context"]
            # Always use the logged-in user's email for calendar invites
            raw_context.email = user["email"]
            links = create_calendar_events(sched_data["raw_schedule"], raw_context)
        else:
            # Rebuild from stored schedule data (after server restart)
            daily_plans = sched_data.get("dailyPlans", [])
            if not daily_plans:
                raise HTTPException(status_code=400, detail="No schedule data to sync. Regenerate the schedule first.")

            # Reconstruct Schedule and ExtractedContext from stored data
            tasks = []
            for dp in daily_plans:
                for t in dp.get("tasks", []):
                    start_time = t.get("time", "09:00")
                    duration_mins = t.get("duration", 60)
                    # Calculate end time
                    try:
                        fmt = "%H:%M"
                        start_dt = datetime.datetime.strptime(start_time, fmt)
                        end_dt = start_dt + datetime.timedelta(minutes=duration_mins)
                        end_time = end_dt.strftime(fmt)
                    except Exception:
                        end_time = "10:00"
                    tasks.append(DailyTask(title=t.get("title", "Task"), start_time=start_time, end_time=end_time))

            rebuilt_schedule = Schedule(days=len(tasks), daily_template=tasks)
            rebuilt_context = ExtractedContext(
                start_date=sched_data.get("startDate", "today"),
                duration_days=len(tasks),
                tasks=[t.title for t in tasks],
                email=user["email"],
                gap_days=1,
            )
            links = create_calendar_events(rebuilt_schedule, rebuilt_context)

        Store.track_activity(user["uid"], "Calendar Sync")
        return {"status": "success", "links": links}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/users/{user_id}/activity")
async def get_user_activity(user_id: str, admin: dict = Depends(require_admin)):
    return {"logs": Store.get_activity_logs(user_id)}


@app.get("/api/admin/activity")
async def get_admin_activity(admin: dict = Depends(require_admin)):
    return {"logs": Store.get_activity_logs()}


@app.get("/api/activity")
async def get_my_activity(user: dict = Depends(get_current_user)):
    return {"logs": Store.get_activity_logs(user_id=user["uid"])}


@app.post("/api/admin/users/{user_id}/upgrade")
async def upgrade_user(user_id: str, admin: dict = Depends(require_admin)):
    u = Store.get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u["subscription"] = "premium"
    Store.save_user(user_id, u)
    u.pop("password_hash", None)
    u["subscriptionType"] = "premium"
    return {"status": "success", "user": u}


class AdminUserUpdateRequest(BaseModel):
    subscription: Optional[str] = None  # "free" | "premium"
    role: Optional[str] = None          # "user" | "admin" | "super_admin"


@app.patch("/api/admin/users/{user_id}")
async def admin_update_user(user_id: str, req: AdminUserUpdateRequest, admin: dict = Depends(require_admin)):
    u = Store.get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Only super_admin can change roles
    if req.role is not None:
        if admin.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Only super_admin can change roles")
        allowed_roles = {"user", "admin", "super_admin"}
        if req.role not in allowed_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {allowed_roles}")
        u["role"] = req.role

    if req.subscription is not None:
        if req.subscription not in {"free", "premium"}:
            raise HTTPException(status_code=400, detail="Invalid subscription. Must be 'free' or 'premium'")
        u["subscription"] = req.subscription

    Store.save_user(user_id, u)
    Store.track_activity(admin["uid"], f"Admin updated user {user_id}: role={req.role}, subscription={req.subscription}")

    u.pop("password_hash", None)
    u["subscriptionType"] = u.get("subscription", "free")
    return {"status": "success", "user": u}

@app.patch("/api/schedules/{schedule_id}/tasks")
async def update_schedule_task(schedule_id: str, data: dict, user: dict = Depends(get_current_user)):
    return {"status": "success"}

@app.get("/api/schedules/{schedule_id}/export/pdf")
async def export_schedule_pdf(schedule_id: str, user: dict = Depends(get_current_user)):
    return {"status": "success", "message": "Exported"}

@app.get("/api/documents/{document_id}/preview")
async def get_document_preview(document_id: str, user: dict = Depends(get_current_user)):
    doc = Store.get_document(document_id, user_id=user["uid"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"url": f"/api/documents/{document_id}/view"}

@app.get("/api/documents/{document_id}/view")
async def view_document(document_id: str, user: dict = Depends(get_current_user)):
    doc = Store.get_document(document_id, user_id=user["uid"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc["path"]):
        raise HTTPException(status_code=404, detail="Document file missing")
    return FileResponse(path=doc["path"], filename=doc["name"])

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    Store.delete_user(user_id)
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)