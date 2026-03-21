from typing import Literal, List, Dict, Any
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableBranch, RunnablePassthrough
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
# Initialize tools
search_tool = DuckDuckGoSearchRun()
wikipedia = WikipediaAPIWrapper()
wikipedia_tool = WikipediaQueryRun(api_wrapper=wikipedia)

class MainRoute(BaseModel):
    agent: Literal["writer", "code", "chat"]


def create_model_chain(llm, system_prompt, tools: List = None):
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])
    
    if not tools:
        return prompt | llm | RunnableLambda(lambda x: x.content if hasattr(x, "content") else str(x))

    # For models with tools, we want them to actually use the results
    llm_with_tools = llm.bind_tools(tools)

    def invoke_with_tools(x):
        try:
            # First invocation
            response = (prompt | llm_with_tools).invoke(x)
            
            if not hasattr(response, "tool_calls") or not response.tool_calls:
                return response.content if hasattr(response, "content") else str(response)

            # If there are tool calls, execute them and then call LLM again with results
            messages = [
                HumanMessage(content=x["input"]),
                response
            ]
            
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"].lower()
                # Find the tool by name (case-insensitive)
                selected_tool = next((t for t in tools if t.name.lower() == tool_name or getattr(t, "name", "").lower() == tool_name), None)
                
                if selected_tool:
                    try:
                        tool_result = selected_tool.invoke(tool_call["args"])
                        messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call["id"], name=tool_call["name"]))
                    except Exception as e:
                        messages.append(ToolMessage(content=str(e), tool_call_id=tool_call["id"], name=tool_call["name"]))
                else:
                    messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found.", tool_call_id=tool_call["id"], name=tool_call["name"]))

            # Second invocation to summarize tool results
            final_prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt + "\nUse the tool results provided in the conversation to give a final answer."),
                *messages
            ])
            
            final_response = llm.invoke(final_prompt.format_messages())
            return final_response.content if hasattr(final_response, "content") else str(final_response)
            
        except Exception as e:
            # Fallback for any tool-related errors: just run without tools
            fallback_response = (prompt | llm).invoke(x)
            return fallback_response.content if hasattr(fallback_response, "content") else str(fallback_response)

    return RunnableLambda(invoke_with_tools)

def writer_model():
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    system_prompt = "You are a professional writer. Generate high-quality, clear, and well-structured content. Adapt tone to the user's intent. Avoid unnecessary verbosity."
    return create_model_chain(llm, system_prompt)


def code_model():
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    system_prompt = "You are a senior software engineer. Write correct, clean, and efficient code. Explain briefly only if necessary."
    return create_model_chain(llm, system_prompt, tools=[search_tool, wikipedia_tool])

@tool
def admin_db_query(query: str, user_id: str = None, user_role: str = None) -> str:
    """
    Search the database for user details, user activity, or system statistics.
    Pass the user's name, email, or 'all' to get summaries.
    Strictly restricted to users with 'super_admin' or 'admin' roles.
    """
    if user_role not in ["super_admin", "admin"]:
        return "Access Denied: You do not have the necessary permissions to query the administrative database."

    try:
        from db_manager import Store
        import json
        users = Store.get_users()
        
        # If query asks for a specific user name or email
        matched_users = []
        for u in users:
            if query.lower() in u.get("name", "").lower() or query.lower() in u.get("email", "").lower():
                matched_users.append(u)
        
        if not matched_users and query.lower() != "all":
            pass # Maybe they just asked a general question, we will return a summary
        else:
            users = matched_users if matched_users else users
            
        result = []
        for u in users:
            uid = u.get("id")
            activity = Store.get_activity_logs(uid)
            result.append({"user": u, "activity": activity})
            
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error accessing database: {e}"

@tool
def system_explorer(query: str) -> str:
    """
    Acts as an exploration agent traversing frontend, backend, and admin flows.
    Builds an internal understanding of the system structure. 
    Use this to understand architecture, schemas, or routing logic.
    """
    import os
    try:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        tree = []
        for root, dirs, files in os.walk(base):
            if any(ignore in root for ignore in [".git", "node_modules", "__pycache__", ".venv", ".next"]):
                continue
            level = root.replace(base, '').count(os.sep)
            indent = ' ' * 4 * level
            tree.append(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if f.endswith(('.py', '.js', '.ts', '.tsx', '.json', '.md', '.sql', '.db')):
                    tree.append(f"{subindent}{f}")
        return "Internal Platform Workspace Tree:\n" + "\n".join(tree[:200]) + "\n(Truncated for length)"
    except Exception as e:
        return f"Exploration error: {e}"

def chat_model():
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    system_prompt = "You are a helpful conversational assistant and autonomous product agent. Answer naturally. You have full systemic administrative access when authorized, enabling system_explorer and admin_db_query tools."
    return create_model_chain(llm, system_prompt, tools=[search_tool, wikipedia_tool, admin_db_query, system_explorer])

# Router setup
router_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
router_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an intelligent router. Choose exactly ONE agent: writer, code, or chat. Respond ONLY with the agent name."),
    ("human", "{input}")
])

# Create chains
writer_chain = writer_model()
code_chain = code_model()
chat_chain = chat_model()

def build_final_chain():
    # Simple router that avoids structured output if possible for speed and robustness
    def route(x):
        try:
            # Try structured output first
            structured_router = router_prompt | router_llm.with_structured_output(MainRoute)
            return structured_router.invoke(x).agent
        except:
            # Fallback to simple text parsing
            res = (router_prompt | router_llm).invoke(x).content.lower()
            for agent in ["writer", "code", "chat"]:
                if agent in res: return agent
            return "chat"

    return (
        RunnablePassthrough.assign(agent=RunnableLambda(route))
        | RunnableBranch(
            (lambda x: x["agent"] == "writer", writer_chain),
            (lambda x: x["agent"] == "code", code_chain),
            chat_chain
        )
    )

final_chain = build_final_chain()
