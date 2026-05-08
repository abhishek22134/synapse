"""
Run this to test all your API keys before starting the server.
Usage: python test_keys.py
"""
import os
from dotenv import load_dotenv
load_dotenv()

print("\n🔍 Synapse API Key Diagnostic\n" + "="*40)

# ── 1. OpenAI ──────────────────────────────
print("\n1. Testing OpenAI...")
try:
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    r = client.embeddings.create(model="text-embedding-3-small", input="test")
    print("   ✅ OpenAI works")
except Exception as e:
    print(f"   ❌ OpenAI FAILED: {e}")

# ── 2. Pinecone ────────────────────────────
print("\n2. Testing Pinecone...")
try:
    from pinecone import Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    indexes = [i.name for i in pc.list_indexes()]
    print(f"   ✅ Pinecone works — indexes found: {indexes or '(none yet)'}")
except Exception as e:
    print(f"   ❌ Pinecone FAILED: {e}")

# ── 3. Google OAuth tokens ─────────────────
print("\n3. Checking Google credentials in .env...")
gid = os.getenv("GOOGLE_CLIENT_ID", "")
gsec = os.getenv("GOOGLE_CLIENT_SECRET", "")
if gid and gsec and gid != "your-google-client-id":
    print("   ✅ Google credentials present")
else:
    print("   ⚠️  Google credentials missing or still placeholder")

# ── 4. Slack tokens ────────────────────────
print("\n4. Checking Slack credentials in .env...")
sid = os.getenv("SLACK_CLIENT_ID", "")
ssec = os.getenv("SLACK_CLIENT_SECRET", "")
if sid and ssec and sid != "your-slack-client-id":
    print("   ✅ Slack credentials present")
else:
    print("   ⚠️  Slack credentials missing or still placeholder")

print("\n" + "="*40)
print("Fix any ❌ above, then restart: uvicorn main:app --reload")
print()
