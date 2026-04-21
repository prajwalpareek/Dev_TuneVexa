import os
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
TABLE = "spotify_charts_dev"


def _headers() -> dict:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


async def save_songs(songs: list[dict], chart_date=None) -> None:
    base_url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    now = datetime.now(timezone.utc).isoformat()
    chart_date_str = chart_date.isoformat() if chart_date else None

    rows = [
        {
            "rank": s["rank"],
            "track_name": s["track_name"],
            "artist_name": s["artist_name"],
            "streams": s["streams"],
            "daily_change": s["daily_change"],
            "cover_art_url": s.get("cover_art_url"),
            "fetched_at": now,
            "chart_date": chart_date_str,
        }
        for s in songs
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        del_response = await client.delete(
            base_url,
            headers={**_headers(), "Prefer": "return=minimal"},
            params={"id": "gte.0"},
        )
        del_response.raise_for_status()

        ins_response = await client.post(
            base_url,
            headers=_headers(),
            json=rows,
        )
        ins_response.raise_for_status()


async def fetch_songs() -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/{TABLE}",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            },
            params={
                "select": "rank,track_name,artist_name,streams,daily_change,cover_art_url,fetched_at,chart_date",
                "order": "rank.asc",
                "limit": "200",
            },
        )
        response.raise_for_status()
        return response.json()
