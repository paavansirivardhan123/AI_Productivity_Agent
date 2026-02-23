import os
import uuid
import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# Import existing logic
from agents.scheduler import extract_context, generate_schedule as run_scheduler, resolve_start_date
from pyFiles.doc import doc_info

app = FastAPI(title="AI Productivity Agent API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory Store (for demo purposes) ---
chats = {}
documents = {}
users = [
    {"id": "1", "name": "Admin User", "email": "admin@test.com", "role": "admin", "subscription": "premium", "createdAt": "2024-01-01"},
    {"id": "2", "name": "Test User", "email": "user@test.com", "role": "user", "subscription": "free", "createdAt": "2024-02-01"},
]
schedules = {}
activity_logs = {
    "1": [{"id": "a1", "userId": "1", "action": "Login", "timestamp": "2024-10-22T10:00:00"}],
    "2": [{"id": "a2", "userId": "2", "action": "Upload Doc", "timestamp": "2024-10-22T11:30:00"}],
}

# --- Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class ChatCreateRequest(BaseModel):
    title: str

class MessageRequest(BaseModel):
    role: str
    content: str
    tokensUsed: Optional[int] = 0

class QuestionRequest(BaseModel):
    documentId: str
    question: str

# --- Routes ---

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    # Enhanced mock login for testers
    role = "admin" if "admin" in req.email.lower() else "user"
    return {
        "token": "mock-token-" + str(uuid.uuid4()), 
        "user": {
            "id": "tester-" + str(uuid.uuid4())[:8],
            "name": req.email.split("@")[0].capitalize(),
            "email": req.email,
            "role": role,
            "subscriptionType": "premium" if role == "admin" else "free"
        }
    }

@app.post("/api/auth/register")
async def register(req: LoginRequest):
    # Enhanced mock register for testers
    return {
        "token": "mock-token-" + str(uuid.uuid4()), 
        "user": {
            "id": "tester-" + str(uuid.uuid4())[:8],
            "name": req.email.split("@")[0].capitalize(),
            "email": req.email,
            "role": "user",
            "subscriptionType": "free"
        }
    }

@app.get("/api/chats")
async def get_chats():
    return {"chats": list(chats.values())}

@app.post("/api/chats")
async def create_chat(req: ChatCreateRequest):
    chat_id = str(uuid.uuid4())
    new_chat = {
        "id": chat_id,
        "title": req.title,
        "messages": [],
        "updatedAt": datetime.datetime.now().isoformat()
    }
    chats[chat_id] = new_chat
    return new_chat

@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str):
    if chat_id not in chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chats[chat_id]

@app.post("/api/chats/{chat_id}/messages")
async def add_message(chat_id: str, req: MessageRequest):
    if chat_id not in chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    message = {
        "id": str(uuid.uuid4()),
        "role": req.role,
        "content": req.content,
        "timestamp": datetime.datetime.now().isoformat(),
        "tokensUsed": req.tokensUsed
    }
    chats[chat_id]["messages"].append(message)
    chats[chat_id]["updatedAt"] = datetime.datetime.now().isoformat()
    return message

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    if chat_id in chats:
        del chats[chat_id]
    return {"status": "success"}

@app.patch("/api/chats/{chat_id}/messages/{message_id}")
async def update_chat_message(chat_id: str, message_id: str, req: MessageRequest):
    if chat_id not in chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    for msg in chats[chat_id]["messages"]:
        if msg["id"] == message_id:
            msg["content"] = req.content
            return msg
    raise HTTPException(status_code=404, detail="Message not found")

@app.delete("/api/chats/{chat_id}/messages/{message_id}")
async def delete_chat_message(chat_id: str, message_id: str):
    if chat_id not in chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    chats[chat_id]["messages"] = [m for m in chats[chat_id]["messages"] if m["id"] != message_id]
    return {"status": "success"}

@app.post("/api/ai/chat")
async def ai_chat(
    chatId: str = Query(...), 
    message: str = Form(...), 
    file: Optional[UploadFile] = File(None),
    agent: str = Form("chat")
):
    try:
        from agents.agent_chain import (
            chat_chain, 
            code_chain, 
            document_chain, 
            writer_chain, 
            final_chain
        )
        from agents.scheduler import extract_context, generate_schedule
        
        # Scheduler chain: wrapper in server (agent_chain not touched)
        def _scheduler_invoke(x):
            query = x.get("input", "")
            try:
                ctx = extract_context(query)
                sched = generate_schedule(ctx)
                res = f"### Schedule: {ctx.duration_days} days\n"
                for i, t in enumerate(sched.daily_template):
                    res += f"- Day {i+1}: {t.start_time}-{t.end_time} | {t.title}\n"
                return res
            except Exception as ex:
                print(f"❌ Scheduler error: {str(ex)}")
                return f"Could not create schedule: {str(ex)}"
        
        from langchain_core.runnables import RunnableLambda
        scheduler_chain = RunnableLambda(_scheduler_invoke)
        
        # Normalize agent parameter (lowercase, strip whitespace)
        agent = agent.lower().strip() if agent else "chat"
        
        # Mapping agents to their chains - matches agent_chain + server scheduler
        agent_map = {
            "chat": chat_chain,
            "code": code_chain,
            "document": document_chain,
            "writer": writer_chain,
            "scheduler": scheduler_chain,
            "auto": final_chain
        }
        
        # If a file is uploaded, use document model
        if file:
            agent = "document"
        
        selected_chain = agent_map.get(agent, chat_chain)
        print(f"🤖 Using agent: '{agent}'")
        
        context_prepend = ""

        if file:
            os.makedirs("UploadedFiles", exist_ok=True)
            file_path = os.path.join("UploadedFiles", file.filename)
            with open(file_path, "wb") as f:
                f.write(await file.read())
            context_prepend = f"[Document: {file.filename}] "
        
        # Invoke chain
        try:
            response = selected_chain.invoke({"input": context_prepend + message})
        except Exception as invoke_err:
            print(f"⚠️ Chain invocation failed: {str(invoke_err)}")
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            
            fallback_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.7)
            fallback_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a helpful assistant. Provide clear and concise answers."),
                ("human", "{input}")
            ])
            fallback_chain = fallback_prompt | fallback_llm
            resp = fallback_chain.invoke({"input": context_prepend + message})
            response = resp.content if hasattr(resp, "content") else str(resp)
        
        # Ensure response is a string
        if not isinstance(response, str):
            response = str(response)
        
        return {
            "content": response, 
            "tokensUsed": len(response.split()) + len(message.split())
        }
    except Exception as e:
        import traceback
        print("❌ CRITICAL BACKEND ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/scheduler")
async def ai_scheduler(data: dict):
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
            "userId": "1",
            "title": f"Schedule for {goal}",
            "goal": goal,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dailyPlans": daily_plans
        }
        
        # Store for internal features (like calendar sync)
        schedules[result["id"]] = {
            **result,
            "raw_context": context,
            "raw_schedule": schedule
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    # Ensure directory exists
    os.makedirs("UploadedFiles", exist_ok=True)
    # Save file to UploadedFiles
    file_path = os.path.join("UploadedFiles", file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    documents[doc_id] = {"id": doc_id, "name": file.filename, "path": file_path}
    return {"documentId": doc_id, "name": file.filename}

@app.post("/api/ai/document/question")
async def document_question(req: QuestionRequest):
    try:
        doc = documents.get(req.documentId)
        pdf_path = doc["path"] if doc else None
        answer = doc_info(req.question, pdf_path=pdf_path)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/document/summarize")
async def document_summarize(data: dict):
    document_id = data.get("documentId")
    try:
        doc = documents.get(document_id)
        pdf_path = doc["path"] if doc else None
        summary = doc_info("Summarize this document in 3-5 sentences.", pdf_path=pdf_path)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/document/notes")
async def document_notes(data: dict):
    document_id = data.get("documentId")
    try:
        doc = documents.get(document_id)
        pdf_path = doc["path"] if doc else None
        notes = doc_info("Generate detailed study notes for this document with bullet points.", pdf_path=pdf_path)
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/stats")
async def admin_stats():
    return {
        "totalUsers": len(users),
        "premiumUsers": 1,
        "activeSessions": 5,
        "revenueMTD": 1200
    }

@app.get("/api/admin/usage-trends")
async def usage_trends():
    return [
        {"date": "2024-10-20", "chats": 10, "schedules": 2, "documents": 5},
        {"date": "2024-10-21", "chats": 15, "schedules": 3, "documents": 8},
        {"date": "2024-10-22", "chats": 12, "schedules": 1, "documents": 4},
    ]

@app.get("/api/admin/users")
async def admin_users():
    return {"users": users}

@app.post("/api/schedules/{schedule_id}/sync/calendar")
async def sync_calendar(schedule_id: str):
    if schedule_id not in schedules:
        raise HTTPException(status_code=404, detail="Schedule not found")
    sched_data = schedules[schedule_id]
    try:
        from agents.scheduler import create_calendar_events
        links = create_calendar_events(sched_data["raw_schedule"], sched_data["raw_context"])
        return {"status": "success", "links": links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/users/{user_id}/activity")
async def get_user_activity(user_id: str):
    return {"logs": activity_logs.get(user_id, [])}

@app.post("/api/admin/users/{user_id}/upgrade")
async def upgrade_user(user_id: str):
    for user in users:
        if user["id"] == user_id:
            user["subscription"] = "premium"
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="User not found")

@app.patch("/api/schedules/{schedule_id}/tasks")
async def update_schedule_task(schedule_id: str, data: dict):
    return {"status": "success"}

@app.get("/api/schedules/{schedule_id}/export/pdf")
async def export_schedule_pdf(schedule_id: str):
    return {"status": "success", "message": "Exported"}

@app.get("/api/documents/{document_id}/preview")
async def get_document_preview(document_id: str):
    if document_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"url": f"/api/documents/{document_id}/view"}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: str):
    global users
    users = [u for u in users if u["id"] != user_id]
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)