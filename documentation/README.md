# FileMind — Personal File Intelligence System

## 🏛️ System Architecture

```mermaid
flowchart TD
    %% Ingestion
    subgraph INGESTION["1. Document Ingestion & Extraction"]
        Upload["File Upload (.pdf, .docx, .txt)"] --> Extract["Text Extraction\n(pdf-parse / mammoth / fs)"]
        Extract --> FullText["Full Clean Text"]
    end

    %% Chunking
    subgraph CHUNKING["2. Text Chunking Engine"]
        FullText --> Chunker["Sliding Window Chunker\nSize: 1000 chars | Overlap: 200 chars"]
        Chunker --> Chunks["Chunk 1, Chunk 2, ... Chunk N"]
    end

    %% Embedding Pipeline
    subgraph EMBEDDINGS["3. Vector Embedding Pipeline"]
        Chunks --> BatchEmbed["Gemini Embedding API\n(models/gemini-embedding-001)"]
        BatchEmbed --> Vectors["3072-Dimensional Dense Vectors"]
        Vectors --> MongoChunks[("MongoDB: ChunkEmbedding Collection\n- documentId\n- uploadedBy\n- chunkIndex\n- text\n- embedding [3072]")]
    end

    %% Semantic Search & Q&A
    subgraph RETRIEVAL["4. Semantic Search & Grounded Q&A"]
        UserQuery["User Search / Question"] --> QueryEmbed["Gemini Embedding API"]
        QueryEmbed --> QueryVec["Query Vector"]
        QueryVec --> CosineSim["Cosine Similarity Matcher\n(User Scoped: uploadedBy == user.id)"]
        MongoChunks -.-> CosineSim
        CosineSim --> TopK["Top-K Ranked Relevant Chunks"]
        TopK --> QAEngine["Gemini Generation Engine\n(Strict Context & Grounding Prompt)"]
        QAEngine --> Answer["Grounded Answer + Clickable Sources\n(File Name & Chunk Number)"]
    end

    %% Tagging & Summaries
    subgraph TAG_SUM["5. Auto-Tagging & Summarization"]
        FullText --> AutoTag["Auto-Tagging Service\n(Extracts 3-6 Topic Tags)"]
        AutoTag --> MongoDoc[("MongoDB: Document Collection\n- tags: ['OS', 'Memory', ...]\n- summary: '...'")]
        Chunks --> MapReduce["Map-Reduce Summarizer\n(Sectional summaries -> Final synthesis)"]
        MapReduce --> MongoDoc
    end
```

---

## How to Run

### Backend

Open a terminal in the project root:

```bash
cd backend
npm install
npm run dev
```

The backend will start on the configured port, for example:

```text
http://localhost:5000
```

Make sure your `backend/.env` file is configured before starting the server.

---

### Frontend

Open a second terminal in the project root:

```bash
cd frontend
npm install
npm run dev
```

The React + Vite frontend will start at:

```text
http://localhost:5173
```
