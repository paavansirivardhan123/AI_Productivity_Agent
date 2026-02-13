from typing import Literal, List
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableBranch, RunnablePassthrough
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper

search_tool = DuckDuckGoSearchRun()
wikipedia = WikipediaAPIWrapper()
wikipedia_tool = WikipediaQueryRun(api_wrapper=wikipedia)


class MainRoute(BaseModel):
    agent: Literal["writer", "document", "code", "chat"]

@tool
def word_count(text: str) -> int:
    """Count the number of words in the input text."""
    return len(text.split())


@tool
def char_count(text: str) -> int:
    """Count the number of characters in the input text."""
    return len(text)



def run_with_tools(llm, prompt, tools: List):
    if tools:
        llm = llm.bind_tools(tools)

    def invoke_chain(x):
        response = (prompt | llm).invoke(x)

        if not hasattr(response, "tool_calls") or not response.tool_calls:
            return response.content

        results = []
        for call in response.tool_calls:
            tool_fn = next(t for t in tools if t.name == call["name"])
            results.append(str(tool_fn.invoke(call["args"])))

        return "\n".join(results)

    return RunnableLambda(invoke_chain)


def writer_model():
    tools = []

    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system",
             """
        You are a professional writer.
        Generate high-quality, clear, and well-structured content.
        Adapt tone to the user's intent. Avoid unnecessary verbosity.
        """
             ),
            ("human", "{input}")
        ]
    )

    return run_with_tools(llm, prompt, tools)


def document_model():
    tools = [word_count]

    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system",
             """
        You are a document analysis assistant.
        Summarize, extract key points, or analyze content clearly.
        """
             ),
            ("human", "{input}")
        ]
    )

    return run_with_tools(llm, prompt, tools)


def code_model():
    tools = [search_tool, wikipedia_tool]

    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system",
             """
        You are a senior software engineer.
        Write correct, clean, and efficient code.
        Explain briefly only if necessary.
        """
             ),
            ("human", "{input}")
        ]
    )

    return run_with_tools(llm, prompt, tools)


def chat_model():
    tools = [search_tool, wikipedia_tool]

    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system",
             """
        You are a helpful conversational assistant.
        Answer naturally and clearly.
        """
             ),
            ("human", "{input}")
        ]
    )

    return run_with_tools(llm, prompt, tools)


router_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

router_prompt = ChatPromptTemplate.from_messages(
    [
        ("system",
         """
        You are an intelligent router.
        Choose exactly ONE agent:
        - writer
        - document
        - code
        - chat
        Respond ONLY with the agent name.
        """
        ),
        ("human", "{input}")
    ]
)

router_chain = router_prompt | router_llm.with_structured_output(MainRoute)


writer_chain = writer_model()
document_chain = document_model()
code_chain = code_model()
chat_chain = chat_model()


def build_final_chain():
    return (
        RunnableLambda(lambda x: {"input": x})
        | RunnablePassthrough.assign(route=lambda x: router_chain.invoke(x))
        | RunnableBranch(
            (lambda x: x["route"].agent == "writer", writer_chain),
            (lambda x: x["route"].agent == "document", document_chain),
            (lambda x: x["route"].agent == "code", code_chain),
            (lambda x: x["route"].agent == "chat", chat_chain),
            chat_chain
        )
    )

final_chain = build_final_chain()