from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
from typing import Dict, Any
from services.chunker import make_chunks
from services.vector_store import upsert_chunks
from core.config import settings

EXPORTABLE_TYPES = {
    "application/vnd.google-apps.document":     ("text/plain", ".txt"),
    "application/vnd.google-apps.spreadsheet":  ("text/csv",   ".csv"),
    "application/vnd.google-apps.presentation": ("text/plain", ".txt"),
}
MAX_FILE_SIZE = 5 * 1024 * 1024


def build_drive_service(access_token: str, refresh_token: str):
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
    )
    return build("drive", "v3", credentials=creds)


def list_all_files(service):
    files, page_token = [], None
    query = "trashed=false and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.presentation' or mimeType='text/plain')"
    while True:
        kwargs = {"q": query, "pageSize": 100, "fields": "nextPageToken, files(id, name, mimeType, size, webViewLink, modifiedTime)"}
        if page_token:
            kwargs["pageToken"] = page_token
        result = service.files().list(**kwargs).execute()
        files.extend(result.get("files", []))
        page_token = result.get("nextPageToken")
        if not page_token or len(files) >= 1000:
            break
    return files


def extract_text(service, file: Dict) -> str | None:
    mime, file_id = file["mimeType"], file["id"]
    try:
        if mime in EXPORTABLE_TYPES:
            export_mime, _ = EXPORTABLE_TYPES[mime]
            request = service.files().export_media(fileId=file_id, mimeType=export_mime)
        elif mime == "text/plain":
            if int(file.get("size", 0)) > MAX_FILE_SIZE:
                return None
            request = service.files().get_media(fileId=file_id)
        else:
            return None
        buf = io.BytesIO()
        dl = MediaIoBaseDownload(buf, request)
        done = False
        while not done:
            _, done = dl.next_chunk()
        return buf.getvalue().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[Drive] Failed {file['name']}: {e}")
        return None


async def index_google_drive(access_token: str, refresh_token: str, org_id: str = "default") -> Dict[str, Any]:
    service = build_drive_service(access_token, refresh_token)
    files = list_all_files(service)
    total_chunks, indexed, skipped = 0, 0, 0

    for file in files:
        text = extract_text(service, file)
        if not text or len(text.strip()) < 50:
            skipped += 1
            continue
        text = clean_text(text)
        metadata = {"title": file["name"], "url": file.get("webViewLink", ""), "source": "google_drive", "file_id": file["id"]}
        chunks = make_chunks(text, metadata, "google_drive", settings.chunk_size, settings.chunk_overlap)
        for chunk in chunks:
            chunk["text"] = clean_text(chunk["text"])
        if chunks:
            await upsert_chunks(chunks, "google_drive", org_id)
            total_chunks += len(chunks)
            indexed += 1

    return {"source": "google_drive", "files_found": len(files), "files_indexed": indexed, "files_skipped": skipped, "chunks_stored": total_chunks}
def clean_text(text: str) -> str:
    return text.replace("\x00", "")

