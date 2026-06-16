import os
from typing import List, Dict, Any

import httpx

NANGO_BASE_URL = "https://api.nango.dev"


def _nango_headers(provider_config_key: str, connection_id: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {os.environ.get('NANGO_SECRET_KEY', '')}",
        "Provider-Config-Key": provider_config_key,
        "Connection-Id": connection_id,
        "Content-Type": "application/json",
    }


async def fetch_notion_pages(user_id: str, connection_id: str) -> List[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{NANGO_BASE_URL}/proxy/v1/search",
                headers=_nango_headers("notion", connection_id),
                json={"filter": {"value": "page", "property": "object"}},
            )
            response.raise_for_status()
            data = response.json()

        pages: List[Dict[str, Any]] = []
        for result in data.get("results", []):
            title = ""
            props = result.get("properties", {})
            for key in ("title", "Name", "Title"):
                title_field = props.get(key, {})
                title_parts = title_field.get("title", [])
                if title_parts:
                    title = "".join(p.get("plain_text", "") for p in title_parts)
                    break

            content_parts: List[str] = []
            if result.get("url"):
                content_parts.append(f"URL: {result['url']}")
            for key, val in props.items():
                if val.get("type") == "rich_text":
                    for chunk in val.get("rich_text", []):
                        text = chunk.get("plain_text", "")
                        if text:
                            content_parts.append(text)

            pages.append(
                {
                    "title": title or "Untitled",
                    "content": " ".join(content_parts) or title or "No content",
                }
            )

        return pages
    except Exception as e:
        raise RuntimeError(f"Failed to fetch Notion pages: {str(e)}") from e


async def fetch_trello_cards(user_id: str, connection_id: str) -> List[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{NANGO_BASE_URL}/proxy/1/members/me/cards",
                headers=_nango_headers("trello", connection_id),
                params={"fields": "name,desc,url,labels,due,idList"},
            )
            response.raise_for_status()
            cards = response.json()

        return [
            {
                "name": card.get("name", "Untitled"),
                "description": card.get("desc", ""),
            }
            for card in (cards if isinstance(cards, list) else [])
        ]
    except Exception as e:
        raise RuntimeError(f"Failed to fetch Trello cards: {str(e)}") from e
