from fastapi import FastAPI, Request, HTTPException, Depends, Body
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import database
import subprocess

# Define Pydantic models for request/response validation
class DiagramCreate(BaseModel):
    title: str
    content: str
    tags: Optional[str] = None

class DiagramUpdate(BaseModel):
    title: str
    content: str
    tags: Optional[str] = None

class DiagramResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: str
    updated_at: str
    tags: Optional[str] = None

# Initialize FastAPI app
app = FastAPI(title="Local Mermaid Studio")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="templates")

def get_git_tag():
    try:
        tag = subprocess.check_output(
            ["git", "describe", "--tags", "--always"],
            stderr=subprocess.STDOUT
        ).decode().strip()
        return tag
    except subprocess.CalledProcessError:
        return "unknown"

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    database.init_db()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# API endpoints for diagram management
@app.post("/api/diagrams", response_model=DiagramResponse)
async def create_diagram(diagram: DiagramCreate):
    try:
        diagram_id = database.save_diagram(diagram.title, diagram.content, diagram.tags)
        saved_diagram = database.get_diagram(diagram_id)
        if not saved_diagram:
            raise HTTPException(status_code=500, detail="Failed to retrieve saved diagram")
        return saved_diagram
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/diagrams", response_model=List[DiagramResponse])
async def list_diagrams():
    try:
        return database.get_all_diagrams()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Search endpoint needs to be before the {diagram_id} endpoint to avoid conflicts
@app.get("/api/diagrams/search/{query}", response_model=List[DiagramResponse])
async def search_diagrams(query: str):
    try:
        return database.search_diagrams(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/diagrams/recent", response_model=DiagramResponse)
async def get_recent_diagram():
    try:
        diagram = database.get_most_recent_diagram()
        if not diagram:
            raise HTTPException(status_code=404, detail="No diagrams found")
        return diagram
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(diagram_id: int):
    diagram = database.get_diagram(diagram_id)
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram

@app.put("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
async def update_diagram(diagram_id: int, diagram: DiagramUpdate):
    success = database.update_diagram(diagram_id, diagram.title, diagram.content, diagram.tags)
    if not success:
        raise HTTPException(status_code=404, detail="Diagram not found")
    updated_diagram = database.get_diagram(diagram_id)
    if not updated_diagram:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated diagram")
    return updated_diagram

@app.delete("/api/diagrams/{diagram_id}")
async def delete_diagram(diagram_id: int):
    success = database.delete_diagram(diagram_id)
    if not success:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return {"success": True}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
