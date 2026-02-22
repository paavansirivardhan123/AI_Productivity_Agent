import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

def load_pdf(pdf_path: str):
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at {pdf_path}")
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    return documents


def split_documents(pdf_path: str):
    documents = load_pdf(pdf_path)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    return chunks

def similarity_search_func(query: str, pdf_path: str):
    # Use a specific vector store for each document to avoid cross-contamination
    # For simplicity, we'll use a subfolder in vector_store based on the filename
    filename = os.path.basename(pdf_path)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    vector_store_root = os.path.abspath(os.path.join(BASE_DIR, "..", "vector_store"))
    doc_vs_path = os.path.join(vector_store_root, filename)
    
    if os.path.exists(doc_vs_path):
        vector_store = Chroma(
            persist_directory=doc_vs_path,
            embedding_function=embedding_model
        )
    else:
        vector_store = Chroma.from_documents(
            documents = split_documents(pdf_path),
            embedding = embedding_model,
            persist_directory = doc_vs_path
        )

    docs = vector_store.similarity_search(query, k=2)
    return "\n\n".join(doc.page_content for doc in docs)

def doc_info(query: str, pdf_path: str = None):
    if pdf_path is None:
        # Fallback to Example.pdf for backward compatibility
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
        pdf_path = os.path.abspath(os.path.join(BASE_DIR, "..", "UploadedFiles", "Example.pdf"))

    context = similarity_search_func(query, pdf_path)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system",
             """
                You are an information extraction assistant.
                Be concise.
                If the information is not present, give the user until where you have found the information and say that "information is not present" for that particular question in the document.
                Return only what is asked, nothing extra.
                output format like
                {{ question : answer }}
             """
            ),
            ("human",
             """
                Document Context:
                {context}

                Question:
                {question}
             """
            )
        ]
    )

    response = (prompt | llm).invoke({
        "context": context,
        "question": query
    })

    return response.content.strip()
