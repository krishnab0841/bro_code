<div align="center">

# 🤖 Bro Code

### *Your AI Dev Team — One Prompt, Entire Projects*

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestration-orange.svg)](https://github.com/langchain-ai/langgraph)
[![Anthropic Claude](https://img.shields.io/badge/Claude-Sonnet_4-blueviolet.svg)](https://www.anthropic.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Bro Code** is a multi-agent AI coding assistant with a **Lovable.dev-style web UI**. Type a prompt, watch three AI agents plan, architect, and write your project in real-time — with live file previews in the browser.

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Examples](#-example-prompts--output) · [Future Scope](#-future-scope)

</div>

---

## 📋 Problem Statement

Building software from scratch is time-consuming, even for experienced developers. You need to decide on file structure, plan the architecture, wire up dependencies, and implement every module — all before shipping a single feature.

**Bro Code eliminates this overhead.** Describe what you want in plain English, and a team of three autonomous AI agents collaborates to deliver a production-ready project scaffold in seconds — with a live preview right in your browser.

---

## ✨ Features

- 🧠 **Multi-Agent System** — Three specialized AI agents (Planner, Architect, Coder) collaborate through a directed graph pipeline
- 🌐 **Web UI** — Lovable.dev-style browser interface with live file tree, streaming agent logs, and iframe preview
- 🔄 **Real-Time Streaming** — Server-Sent Events (SSE) stream agent progress to the browser as it happens
- 📂 **Real File Output** — Writes actual project files to disk
- 🏗️ **Structured Planning** — Pydantic-validated plans & task breakdowns ensure well-organized projects
- 🛡️ **Sandboxed Execution** — All file operations are confined to a `generated_project/` directory for safety
- ⚡ **Powered by Claude** — Uses Anthropic's Claude Sonnet 4 for high-quality code generation
- 🔧 **Tool-Using Coder Agent** — Uses LangGraph's ReAct agent with file I/O tools
- 🎯 **Dependency-Aware Task Ordering** — Architect ensures files are implemented in the correct order
- 🖥️ **CLI Mode** — Still works from the command line with `python main.py`

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     BROWSER (React + Vite)                         │
│  ┌──────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │ File Tree│  │ Prompt + Agent Logs  │  │  Live Preview       │  │
│  │          │  │       (SSE)          │  │  (iframe)           │  │
│  └──────────┘  └──────────────────────┘  └─────────────────────┘  │
└─────────────────────────┬──────────────────────────────────────────┘
                          │ HTTP + SSE
┌─────────────────────────┴──────────────────────────────────────────┐
│                   FastAPI Backend (server.py)                       │
│   POST /api/generate → job_id    GET /api/stream/{id} → SSE       │
│   GET /api/files                 DELETE /api/reset                 │
│   /preview/* → StaticFiles                                         │
└─────────────────────────┬──────────────────────────────────────────┘
                          │ Thread + Queue
┌─────────────────────────┴──────────────────────────────────────────┐
│                    LangGraph Agent Pipeline                         │
│                                                                     │
│  ┌──────────┐  Plan   ┌───────────┐  TaskPlan  ┌──────────┐       │
│  │ Planner  │────────▶│ Architect │───────────▶│  Coder   │──┐    │
│  │  Agent   │         │   Agent   │            │  Agent   │  │    │
│  └──────────┘         └───────────┘            └────┬─────┘  │    │
│                                                     │ loop   │    │
│                                                     └────────┘    │
│                                                     │             │
│                                                  [DONE]           │
└────────────────────────────────────────────────────────────────────┘
```

### Agent Roles

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **🗺️ Planner** | Analyzes the user prompt and produces a high-level project plan | User's natural language prompt | `Plan` — app name, description, tech stack, features, file list |
| **📐 Architect** | Breaks the plan into ordered, dependency-aware engineering tasks | `Plan` object | `TaskPlan` — ordered `ImplementationTask` items with file paths and detailed descriptions |
| **💻 Coder** | Implements each task using LangGraph's ReAct agent with file tools | `TaskPlan` + current task index | Actual project files written to disk |

---

## 🔄 How It Works

### Agent Data Flow

1. **User types a prompt** in the web UI (or CLI)
2. **Planner Agent** converts the prompt into a `Plan` (Pydantic model: name, tech stack, features, file list)
3. **Architect Agent** breaks the `Plan` into an ordered `TaskPlan` with self-contained implementation tasks
4. **Coder Agent (ReAct)** iterates through each task, reads existing files, generates code, and writes files to disk
5. **Events stream** to the browser via SSE — agent logs appear in real-time, files appear in the file tree, and the preview iframe loads automatically

### System Design — How Agents Communicate

```
                        ┌─────────────────────────────────────────────────┐
                        │         Shared State (Python Dict)              │
                        │                                                 │
                        │  user_prompt ─── plan ─── task_plan ─── status  │
                        │                          coder_state            │
                        └─────────────────────────────────────────────────┘
                              ▲              ▲            ▲          ▲
                           writes          writes       writes     writes

  User Prompt ──▶ Planner Agent ──▶ Architect Agent ──▶ Coder Agent ──▶ [DONE]
                                                            │    ▲
                                                            └────┘ (loop)
```

**Key Design Decisions:**

- **LangGraph `StateGraph`** manages agent orchestration — each agent is a node, edges define execution flow
- **Thread + Queue pattern** bridges synchronous LangGraph with async FastAPI for SSE streaming
- **Job-based SSE** — POST starts a background thread, returns a `job_id`; GET streams events for that job
- **Pydantic models** (`Plan`, `TaskPlan`, `CoderState`) ensure data integrity at every handoff
- **ReAct pattern** for the Coder agent allows it to reason and use tools autonomously
- **Path sandboxing** via `safe_path_for_project()` prevents writes outside the project directory

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Python 3.11+** | Core language |
| **LangGraph** | Multi-agent orchestration via stateful directed graphs |
| **LangChain** | LLM abstraction and tool framework |
| **Anthropic Claude** | Sonnet 4 for high-quality code generation |
| **FastAPI** | Backend REST API + SSE streaming |
| **React 19** | Frontend UI framework |
| **Vite** | Frontend build tool with HMR and proxying |
| **Pydantic** | Structured output validation and state management |
| **SSE (Server-Sent Events)** | Real-time agent-to-browser streaming |
| **uv** | Fast Python package & environment management |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** — [Download here](https://www.python.org/downloads/)
- **Node.js 18+** — [Download here](https://nodejs.org/)
- **uv** (recommended) — [Install uv](https://docs.astral.sh/uv/getting-started/installation/)
- **Anthropic API Key** — [Get your API key](https://console.anthropic.com/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/krishnab0841/bro_code.git
cd bro_code

# 2. Python setup
uv venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

uv pip install -r pyproject.toml

# 3. Frontend setup
cd frontend
npm install
cd ..

# 4. Environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Running the App

**Option 1 — Quick start script:**
```bash
# Windows:
start.bat

# macOS/Linux:
chmod +x start.sh
./start.sh
```

**Option 2 — Manual (two terminals):**
```bash
# Terminal 1: Backend
uvicorn backend.server:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

**Option 3 — CLI mode** (no web UI):
```bash
python main.py
```

---

## 💡 Example Prompts & Output

### Prompt Examples

```
• Create a to-do list application using HTML, CSS, and JavaScript
• Build a simple calculator web application
• Create a blog API in FastAPI with a SQLite database
• Build a weather dashboard using HTML and vanilla JS
• Create a personal portfolio website with dark mode
```

### Example — "Create a to-do app"

**What Bro Code generates:**

```
generated_project/
├── index.html      # Main HTML structure with task input form and list
├── style.css       # Modern, responsive styling with animations
└── app.js          # Full CRUD logic — add, complete, delete tasks
```

---

## 🎬 Demo

> 🚧 **Demo GIF/video coming soon!** Run the project locally to see the agents in action.

---

## ⚠️ Limitations

- **No debugging or testing** — Generated code is not automatically tested or validated
- **Single prompt context** — Agents don't retain memory between runs
- **LLM-dependent quality** — Output quality depends on Claude's capabilities
- **No interactive editing** — Cannot iteratively refine generated code through conversation
- **Rate limits** — Subject to Anthropic API rate limits

---

## 🔮 Future Scope

| Feature | Description |
|---------|-------------|
| 🧠 **Memory-Enabled Agents** | Persistent memory across sessions using vector stores |
| 🐛 **Debugging Agent** | Reviews generated code, catches errors, auto-fixes issues |
| 🧪 **Testing Agent** | Generates and runs unit tests for every generated file |
| 📦 **Deployment Agent** | Auto-generates Dockerfiles, CI/CD configs, deploys to cloud |
| 🔁 **Iterative Refinement** | Chat-based follow-up prompts to modify generated projects |
| 📊 **Code Quality Scoring** | Automated linting, complexity analysis, quality reports |
| 🗂️ **Template Library** | Pre-built project templates for common patterns |

---

## 📝 Resume-Ready Description

> - **Engineered a multi-agent AI coding assistant** using LangGraph and LangChain that autonomously generates full project scaffolds from natural-language prompts, featuring a Lovable.dev-style React web UI with real-time SSE streaming and live preview
> - **Designed a full-stack agent orchestration system** with FastAPI backend, thread-safe SSE event streaming, Pydantic-validated inter-agent communication, and sandboxed file I/O — powered by Anthropic Claude Sonnet 4
> - **Built an end-to-end autonomous code generation pipeline** featuring three coordinated AI agents (Planner → Architect → Coder), conditional graph execution, ReAct-pattern tool usage, and a browser-based live project preview

---

## 📁 Project Structure

```
bro_code/
├── backend/
│   ├── __init__.py
│   └── server.py              ← FastAPI app with SSE streaming
├── agent/
│   ├── __init__.py
│   ├── graph.py               ← LangGraph state graph + build_graph() factory
│   ├── prompts.py             ← System & user prompt templates
│   ├── states.py              ← Pydantic models (Plan, TaskPlan, CoderState)
│   └── tools.py               ← File tools with SSE event pushing
├── frontend/
│   ├── package.json
│   ├── vite.config.js         ← Proxy /api and /preview to backend
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            ← Main 3-panel layout + SSE logic
│       ├── index.css          ← Dark theme styles
│       └── components/
│           ├── FileTree.jsx
│           ├── AgentLog.jsx
│           ├── PreviewPanel.jsx
│           └── FileModal.jsx
├── generated_project/         ← AI writes files here, served as /preview
├── main.py                    ← CLI entry point (preserved)
├── start.bat                  ← Windows startup script
├── start.sh                   ← Unix startup script
├── pyproject.toml
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/my-awesome-feature`
3. **Commit** your changes: `git commit -m "feat: add my awesome feature"`
4. **Push** to the branch: `git push origin feature/my-awesome-feature`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Krishna Bulbule](https://github.com/krishnab0841)**

*If you found this project helpful, give it a ⭐ on GitHub!*

</div>