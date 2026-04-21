import asyncio
import json
import mimetypes
import os
import pathlib
import queue as q_module
import shutil
import threading
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Ensure we import from project root
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from agent.graph import build_graph

app = FastAPI(title="Bro Code API", version="0.2.0")

# CORS — allow all origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent / "generated_project"

# Active job queues
active_jobs: dict[str, q_module.Queue] = {}


class PromptRequest(BaseModel):
    prompt: str


@app.post("/api/generate")
async def generate(request: PromptRequest):
    """Start a new project generation job. Returns a job_id for SSE streaming."""
    job_id = str(uuid.uuid4())
    event_queue = q_module.Queue()
    active_jobs[job_id] = event_queue

    def run_graph():
        try:
            graph = build_graph(event_queue)
            graph.invoke(
                {"user_prompt": request.prompt},
                {"recursion_limit": 100}
            )
            event_queue.put({"type": "done", "message": "✅ Project generated successfully!"})
        except Exception as e:
            event_queue.put({"type": "error", "message": str(e)})

    thread = threading.Thread(target=run_graph, daemon=True)
    thread.start()

    return {"job_id": job_id}


@app.get("/api/stream/{job_id}")
async def stream(job_id: str):
    """SSE stream for a running generation job."""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    event_queue = active_jobs[job_id]

    async def event_generator():
        loop = asyncio.get_event_loop()
        while True:
            try:
                event = await loop.run_in_executor(
                    None, lambda: event_queue.get(timeout=0.2)
                )
                yield {"data": json.dumps(event)}
                if event["type"] in ("done", "error"):
                    # Clean up job
                    active_jobs.pop(job_id, None)
                    break
            except q_module.Empty:
                # Send a heartbeat to keep connection alive
                yield {"data": json.dumps({"type": "heartbeat"})}
                await asyncio.sleep(0.05)

    return EventSourceResponse(event_generator())


@app.get("/api/files")
async def get_files():
    """Return all files in the generated project with their contents."""
    if not PROJECT_ROOT.exists():
        return {"files": []}

    files = []
    for f in sorted(PROJECT_ROOT.rglob("*")):
        if f.is_file():
            relative = str(f.relative_to(PROJECT_ROOT)).replace("\\", "/")
            try:
                content = f.read_text(encoding="utf-8")
            except (UnicodeDecodeError, PermissionError):
                content = "[binary file]"
            files.append({"path": relative, "content": content})

    return {"files": files}


@app.delete("/api/reset")
async def reset():
    """Clear the generated project directory."""
    if PROJECT_ROOT.exists():
        shutil.rmtree(PROJECT_ROOT)
    PROJECT_ROOT.mkdir(parents=True, exist_ok=True)
    return {"status": "ok"}


@app.get("/preview/{file_path:path}")
async def preview_file(file_path: str):
    """Serve files from the generated project for iframe preview."""
    full_path = (PROJECT_ROOT / file_path).resolve()

    # Security: ensure we stay within PROJECT_ROOT
    if not str(full_path).startswith(str(PROJECT_ROOT.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    content_type, _ = mimetypes.guess_type(str(full_path))
    if content_type is None:
        content_type = "application/octet-stream"

    return FileResponse(full_path, media_type=content_type)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
