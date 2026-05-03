from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from typing import Dict, Any, List
from services.chunker import make_chunks
from services.vector_store import upsert_chunks
from core.config import settings

MAX_MESSAGES = 500
MIN_LENGTH = 30


def get_channels(client: WebClient) -> List[Dict]:
    channels, cursor = [], None
    while True:
        kwargs = {"limit": 200, "types": "public_channel"}
        if cursor:
            kwargs["cursor"] = cursor
        result = client.conversations_list(**kwargs)
        channels.extend(result["channels"])
        cursor = result.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return [c for c in channels if not c.get("is_archived")]


def get_messages(client: WebClient, channel_id: str, channel_name: str) -> List[Dict]:
    messages, cursor, fetched = [], None, 0
    while fetched < MAX_MESSAGES:
        kwargs = {"channel": channel_id, "limit": 200}
        if cursor:
            kwargs["cursor"] = cursor
        try:
            result = client.conversations_history(**kwargs)
        except SlackApiError as e:
            if e.response["error"] == "not_in_channel":
                try:
                    client.conversations_join(channel=channel_id)
                    result = client.conversations_history(**kwargs)
                except:
                    break
            else:
                break
        for msg in result.get("messages", []):
            if msg.get("type") == "message" and not msg.get("bot_id") and not msg.get("subtype") and len(msg.get("text", "")) >= MIN_LENGTH:
                messages.append({"text": msg["text"], "ts": msg["ts"], "channel": channel_name, "channel_id": channel_id})
        fetched += len(result.get("messages", []))
        cursor = result.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return messages


async def index_slack(bot_token: str, org_id: str = "default") -> Dict[str, Any]:
    client = WebClient(token=bot_token)
    channels = get_channels(client)
    total_chunks, total_msgs, indexed = 0, 0, 0

    for channel in channels:
        messages = get_messages(client, channel["id"], channel["name"])
        if not messages:
            continue
        total_msgs += len(messages)

        # Group into 50-message blocks
        for i in range(0, len(messages), 50):
            group = messages[i:i+50]
            text = "\n".join(f"[#{m['channel']}] {m['text']}" for m in group)
            metadata = {"title": f"#{channel['name']}", "url": f"https://slack.com/app_redirect?channel={channel['id']}", "source": "slack", "channel": channel["name"]}
            chunks = make_chunks(text, metadata, "slack", settings.chunk_size, settings.chunk_overlap)
            if chunks:
                await upsert_chunks(chunks, "slack", org_id)
                total_chunks += len(chunks)
        indexed += 1

    return {"source": "slack", "channels_found": len(channels), "channels_indexed": indexed, "messages_indexed": total_msgs, "chunks_stored": total_chunks}
