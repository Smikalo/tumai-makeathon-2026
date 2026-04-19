import os
from typing import Any
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

# Mock TUM docs describing integrations
tum_docs = [
    Document(
        page_content="gocast API for video streaming and lectures. "
                     "Base URL: https://gocast.tum.de/api. Endpoints: GET /videos, GET /lectures. "
                     "Returns a list of video objects with titles and URLs.",
        metadata={"source": "gocast"}
    ),
    Document(
        page_content="TUM Shibboleth SSO Technical Flow. "
                     "1. Navigate to 'https://campus.tum.de/tumonline/webnav.ini' to trigger SSO. "
                     "2. Redirects to 'https://idp.tum.de/idp/profile/SAML2/Redirect/SSO'. "
                     "3. LOGIN FORM SELECTORS: "
                     "   - Username input: 'input#username' "
                     "   - Password input: 'input#password' "
                     "   - Submit button: 'button[name=\"_eventId_proceed\"]' "
                     "4. After login, wait for redirection back to 'campus.tum.de'. "
                     "5. SUCCESS INDICATOR: Presence of element 'div#funktions-navigation' or URL containing 'webnav.ini'.",
        metadata={"source": "Shibboleth"}
    ),
    Document(
        page_content="Campus-Backend (TUMonline) student data. "
                     "AUTHENTICATION: After Shibboleth SSO is successful, the browser can access private endpoints. "
                     "Use this for grades, transcripts, and personal registrations.",
        metadata={"source": "Campus-Backend"}
    ),
    Document(
        page_content="eat-api for Mensa food menus. "
                     "Base URL: https://eat.tum.de/api. Endpoints: GET /menus, GET /cafeterias. "
                     "Returns daily menus with prices and allergens.",
        metadata={"source": "eat-api"}
    ),
]

# We use Ollama for local embeddings
try:
    embeddings = OllamaEmbeddings(model="llama3.1")
    vectorstore = Chroma.from_documents(documents=tum_docs, embedding=embeddings, persist_directory="./chroma_db")
except Exception as e:
    print(f"Failed to initialize Chroma with OllamaEmbeddings: {e}")
    # Fallback to local fake embeddings for testing/build purposes
    from langchain_core.embeddings import Embeddings
    class FakeEmbeddings(Embeddings):
        def embed_documents(self, texts):
            return [[0.1]*4096 for _ in texts] # Llama3 embedding dimension
        def embed_query(self, text):
            return [0.1]*4096
    vectorstore = Chroma.from_documents(documents=tum_docs, embedding=FakeEmbeddings(), persist_directory="./chroma_db")

retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

def query_tum_api_context(query: Any) -> str:
    """Queries the Vector DB for context on how to integrate with TUM APIs."""
    if not query or not isinstance(query, str) or query.strip() == "":
        return ""
    try:
        docs = retriever.invoke(query)
        if not docs:
            return ""
        return "\n\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"RAG Error: {e}")
        return ""
