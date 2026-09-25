# Personal File Intelligence System

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

The frontend uses **HTML, CSS, and JavaScript**, so no `npm install` is required.

Open the `frontend/index.html` file using **Live Server** in VS Code.

The frontend will usually run at:

```text
http://127.0.0.1:5500
```

### Run Both

You need **two terminals**:

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**

Open `frontend/index.html` with Live Server.

```text
Frontend → http://127.0.0.1:5500
Backend  → http://localhost:5000
```
