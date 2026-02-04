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

def load_pdf():
   path = os.path.join("UploadedFiles", "Resume_p.pdf")
   loader = PyPDFLoader(path)
   documents = loader.load()
   return documents

def split_documents():
   documents = load_pdf()

   text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
   chunks = text_splitter.split_documents(documents)
   return chunks

def similarity_search_func(query : str):
    if os.path.exists("vector_store"):
        vector_store = Chroma(
            persist_directory="vector_store",
            embedding_function=embedding_model
        )
    else:
        vector_store = Chroma.from_documents(
            documents = split_documents(),
            embedding = embedding_model,
            persist_directory = "vector_store"
        )

    docs = vector_store.similarity_search(query, k=2)
    return "\n\n".join(doc.page_content for doc in docs)

def doc_info(query: str):

    context = similarity_search_func(query)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system",
             """
                You are an information extraction assistant.
                Be concise.
                If the information is not present, give the user until where you have found the information and say that "information is not present" for that particular question in the document.
                Return only what is asked, nothing extra.
                output formate like
                {{ question : answer. }}
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
