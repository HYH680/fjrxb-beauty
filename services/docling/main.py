"""文档抽字旁路（轻量 pypdf）。可换成真正的 docling/marker 镜像。"""
from __future__ import annotations

import io
from fastapi import FastAPI, File, UploadFile
from pypdf import PdfReader

app = FastAPI(title="ai-supermarket-doc-extract")


@app.get("/health")
def health():
    return {"ok": True, "engine": "pypdf"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    raw = await file.read()
    reader = PdfReader(io.BytesIO(raw))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    text = "\n\n".join(p.strip() for p in pages if p and p.strip())
    return {"text": text, "pages": len(reader.pages), "engine": "pypdf"}
