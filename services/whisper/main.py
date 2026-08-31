"""faster-whisper 旁路转写服务。"""
from __future__ import annotations

import os
import ssl
import tempfile

# 国内/证书环境：优先走镜像，减少 HuggingFace 直连失败
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

try:
    import certifi

    ca = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", ca)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", ca)
    os.environ.setdefault("CURL_CA_BUNDLE", ca)
except Exception:
    ca = None

# 本机根证书损坏时允许显式放开（仅开发旁路）
if os.getenv("WHISPER_INSECURE_SSL", "").strip() in {"1", "true", "yes"}:
    ssl._create_default_https_context = ssl._create_unverified_context  # noqa: SLF001

from fastapi import FastAPI, File, UploadFile, HTTPException
from faster_whisper import WhisperModel

app = FastAPI(title="ai-supermarket-whisper")
_model: WhisperModel | None = None
_model_error: str | None = None


def get_model() -> WhisperModel:
    global _model, _model_error
    if _model is not None:
        return _model
    if _model_error:
        raise RuntimeError(_model_error)
    try:
        name = os.getenv("WHISPER_MODEL", "base")
        _model = WhisperModel(name, device="cpu", compute_type="int8")
        _model_error = None
        return _model
    except Exception as exc:  # noqa: BLE001
        _model_error = str(exc)
        raise


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_loaded": _model is not None,
        "model_error": _model_error,
        "hf_endpoint": os.environ.get("HF_ENDPOINT"),
        "ssl_cert_file": os.environ.get("SSL_CERT_FILE"),
    }


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    raw = await file.read()
    try:
        model = get_model()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=(
                "Whisper 模型不可用（站内会自动改用千问 ASR）。"
                f" detail={exc}"
            ),
        ) from exc

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name
        segments, _info = model.transcribe(tmp_path)
        text = "".join(seg.text for seg in segments).strip()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
    return {"text": text}
