import re
import httpx
from bs4 import BeautifulSoup
from datetime import date

KWORB_URL = "https://kworb.net/spotify/country/global_daily.html"


def parse_daily_change(text: str) -> int:
    text = text.strip().replace(",", "")
    if not text or text in ("=", "NEW", "RE"):
        return 0
    try:
        return int(text)
    except ValueError:
        return 0


def parse_streams(text: str) -> int:
    text = text.strip().replace(",", "")
    try:
        return int(text)
    except ValueError:
        return 0


def parse_artist_track(raw: str) -> tuple[str, str]:
    raw = raw.strip()
    parts = raw.split("-", 1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return raw, ""


async def scrape_top_200() -> tuple[list[dict], date | None]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(KWORB_URL, headers=headers)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    chart_date = None
    title_tag = soup.find(string=re.compile(r"\d{4}/\d{2}/\d{2}"))
    if title_tag:
        match = re.search(r"(\d{4})/(\d{2})/(\d{2})", title_tag)
        if match:
            chart_date = date(int(match.group(1)), int(match.group(2)), int(match.group(3)))

    table = soup.find("table")
    if not table:
        raise ValueError("Could not find chart table on kworb.net")

    songs = []
    rows = table.find_all("tr")

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 8:
            continue
        try:
            rank = int(cells[0].get_text(strip=True))
        except (ValueError, IndexError):
            continue
        if rank > 200:
            break
        title_cell = cells[2].get_text(strip=True)
        artist_name, track_name = parse_artist_track(title_cell)
        streams = parse_streams(cells[6].get_text(strip=True))
        daily_change = parse_daily_change(cells[7].get_text(strip=True))
        songs.append({
            "rank": rank,
            "artist_name": artist_name,
            "track_name": track_name,
            "streams": streams,
            "daily_change": daily_change,
        })

    return songs[:200], chart_date
