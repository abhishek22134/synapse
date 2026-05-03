"""
Test all API keys for the FREE stack.
Usage: python test_keys.py
"""
import os
from dotenv import load_dotenv
load_dotenv()

print("\n🔍 Synapse Free Stack — API Key Test\n" + "="*42)

# ── 1. Groq ────────────────────────────────
print("\n1. Testing Groq (free AI)...")
try:
    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    r = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": "Say OK"}],
        max_tokens=5,
    )
    print(f"   ✅ Groq works — response: {r.choices[0].message.content.strip()}")
except Exception as e:
    print(f"   ❌ Groq FAILED: {e}")

# ── 2. Sentence Transformers ───────────────
print("\n2. Testing local embeddings (sentence-transformers)...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    emb = model.encode(["test"])
    print(f"   ✅ Embeddings work — shape: {emb.shape}")
except Exception as e:
    print(f"   ❌ Embeddings FAILED: {e}")

# ── 3. Supabase ────────────────────────────
print("\n3. Testing Supabase...")
try:
    from supabase import create_client
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    # Try a simple query — will fail gracefully if table doesn't exist yet
    result = sb.table("documents").select("id").limit(1).execute()
    print(f"   ✅ Supabase connected")
except Exception as e:
    err = str(e)
    if "does not exist" in err or "relation" in err:
        print("   ⚠️  Supabase connected but table missing — run setup_supabase.sql first")
    else:
        print(f"   ❌ Supabase FAILED: {e}")

# ── 4. Google ──────────────────────────────
print("\n4. Checking Google credentials...")
gid = os.getenv("GOOGLE_CLIENT_ID", "")
if gid and gid != "your-google-client-id":
    print("   ✅ Google credentials present")
else:
    print("   ⚠️  Google credentials missing")

# ── 5. Slack ───────────────────────────────
print("\n5. Checking Slack credentials...")
sid = os.getenv("SLACK_CLIENT_ID", "")
if sid and sid != "your-slack-client-id":
    print("   ✅ Slack credentials present")
else:
    print("   ⚠️  Slack credentials missing")

print("\n" + "="*42)
print("All green? Run: uvicorn main:app --reload")
print()
