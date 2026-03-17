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

@tool
def word_count(text: str) -> int:
    """Count the number of words in the input text."""
    return len(text.split())

@tool
def char_count(text: str) -> int:
    """Count the number of characters in the input text."""
    return len(text)

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

def document_model():
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    system_prompt = "You are a document analysis assistant. Summarize, extract key points, or analyze content clearly."
    return create_model_chain(llm, system_prompt, tools=[word_count])

def code_model():
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    system_prompt = "You are a senior software engineer. Write correct, clean, and efficient code. Explain briefly only if necessary."
    return create_model_chain(llm, system_prompt, tools=[search_tool, wikipedia_tool])

def chat_model():
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    system_prompt = "You are a helpful conversational assistant. Answer naturally and clearly."
    return create_model_chain(llm, system_prompt, tools=[search_tool, wikipedia_tool])

# Router setup
router_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
router_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an intelligent router. Choose exactly ONE agent: writer, document, code, or chat. Respond ONLY with the agent name."),
    ("human", "{input}")
])

# Create chains
writer_chain = writer_model()
document_chain = document_model()
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
