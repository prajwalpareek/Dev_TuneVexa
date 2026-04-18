import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"


async def _itunes_search(client: httpx.AsyncClient, query: str) -> str | None:
    for attempt in range(3):
        response = await client.get(
            ITUNES_SEARCH_URL,
            params={"term": query, "media": "music", "entity": "song", "limit": 1},
        )
        if response.status_code == 429:
            wait = int(response.headers.get("Retry-After", "5"))
            await asyncio.sleep(wait)
            continue
        if response.status_code == 403:
            await asyncio.sleep(5)
            continue
        response.raise_for_status()
        results = response.json().get("results", [])
        if results:
            url = results[0].get("artworkUrl100", "")
            if url:
                return url.replace("100x100bb", "600x600bb")
        return None
    return None


async def get_cover_art_url(track_name: str, artist_name: str) -> str | None:
    clean_track = track_name.split("(w/")[0].strip()
    clean_artist = artist_name.split("(w/")[0].strip()
    queries = [f"{clean_track} {clean_artist}", clean_track]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for query in queries:
                url = await _itunes_search(client, query)
                if url:
                    return url
    except Exception as e:
        logger.error(f"iTunes cover art lookup failed for '{track_name}': {e}")
    return None


async def enrich_with_cover_art(songs: list[dict]) -> list[dict]:
    enriched = []
    for i, song in enumerate(songs):
        cover_url = await get_cover_art_url(song["track_name"], song["artist_name"])
        enriched.append({**song, "cover_art_url": cover_url})
        if (i + 1) % 10 == 0:
            logger.info(f"Cover art progress: {i + 1}/{len(songs)}")
        await asyncio.sleep(0.5)
    return enriched
