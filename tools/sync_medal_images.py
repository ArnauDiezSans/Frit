import argparse
import io
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import psycopg
import requests
from PIL import Image, ImageOps


DEFAULT_SIZE = 512
DEFAULT_PADDING = 24
DEFAULT_BATCH_SIZE = 20
DEFAULT_OUTPUT_DIR = Path("FritWeb/src/assets/medallas/jocs")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Descarrega i normalitza les imatges de medalles de joc des de BoardGameGeek."
    )
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Carpeta de sortida dels PNG.")
    parser.add_argument("--size", type=int, default=DEFAULT_SIZE, help="Mida final quadrada en pixels.")
    parser.add_argument("--padding", type=int, default=DEFAULT_PADDING, help="Marge transparent intern en pixels.")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="Jocs per consulta a BGG.")
    parser.add_argument("--force", action="store_true", help="Regenera imatges encara que ja existeixin.")
    parser.add_argument("--dry-run", action="store_true", help="Mostra què faria sense descarregar ni escriure fitxers.")
    parser.add_argument("--limit", type=int, default=None, help="Limita el nombre de jocs processats.")
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL")
    bgg_token = os.environ.get("BGG_APPLICATION_TOKEN") or os.environ.get("Bgg__ApplicationToken")

    if not database_url:
        print("ERROR: falta la variable d'entorn DATABASE_URL.", file=sys.stderr)
        return 1

    if not bgg_token:
        print("ERROR: falta la variable d'entorn BGG_APPLICATION_TOKEN.", file=sys.stderr)
        return 1

    output_dir = Path(args.output_dir)
    games = load_games(database_url)

    if args.limit is not None:
        games = games[: args.limit]

    candidates = select_candidates(games, output_dir, args.size, args.force)
    print(f"Jocs amb BggId: {len(games)}")
    print(f"Imatges a generar: {len(candidates)}")

    if args.dry_run:
        for game in candidates:
            print(f"DRY {game['juego_id']}.png - {game['nombre']} (BGG {game['bgg_id']})")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({
        "User-Agent": "FritApp medal image sync",
        "Authorization": f"Bearer {bgg_token.strip()}",
    })

    image_urls = fetch_bgg_image_urls(session, candidates, args.batch_size)
    generated = 0
    failed = []

    for game in candidates:
        image_url = image_urls.get(game["bgg_id"])
        if not image_url:
            failed.append((game, "BGG no ha retornat imatge"))
            continue

        try:
            image_response = session.get(image_url, timeout=45)
            image_response.raise_for_status()
            medal = build_medal_png(image_response.content, args.size, args.padding)
            output_path = output_dir / f"{game['juego_id']}.png"
            medal.save(output_path, "PNG", optimize=True)
            generated += 1
            print(f"OK {output_path.name} - {game['nombre']}")
            time.sleep(0.2)
        except Exception as exc:
            failed.append((game, str(exc)))

    print(f"Generades: {generated}")
    print(f"Errors: {len(failed)}")

    for game, reason in failed:
        print(f"FAIL {game['juego_id']} - {game['nombre']}: {reason}")

    return 1 if failed else 0


def load_games(database_url: str) -> list[dict]:
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT "JuegoId", "Nombre", "BggId" '
                'FROM "Juegos" '
                'WHERE "BggId" IS NOT NULL '
                'ORDER BY "JuegoId"'
            )
            rows = cur.fetchall()

    return [
        {"juego_id": juego_id, "nombre": nombre, "bgg_id": bgg_id}
        for juego_id, nombre, bgg_id in rows
    ]


def select_candidates(games: list[dict], output_dir: Path, size: int, force: bool) -> list[dict]:
    candidates = []

    for game in games:
        output_path = output_dir / f"{game['juego_id']}.png"
        if force or not is_valid_png(output_path, size):
            candidates.append(game)

    return candidates


def is_valid_png(path: Path, size: int) -> bool:
    if not path.exists():
        return False

    try:
        with Image.open(path) as image:
            return image.format == "PNG" and image.size == (size, size)
    except Exception:
        return False


def fetch_bgg_image_urls(session: requests.Session, games: list[dict], batch_size: int) -> dict[int, str]:
    image_urls = {}

    for start in range(0, len(games), batch_size):
        batch = games[start : start + batch_size]
        ids = ",".join(str(game["bgg_id"]) for game in batch)
        url = f"https://boardgamegeek.com/xmlapi2/thing?id={ids}"

        response = None
        for attempt in range(5):
            response = session.get(url, timeout=45)
            if response.status_code != 202:
                break
            time.sleep(2 + attempt)

        if response is None or response.status_code != 200:
            status = response.status_code if response is not None else "sense resposta"
            print(f"BGG batch fallit HTTP {status}: {ids}", file=sys.stderr)
            continue

        root = ET.fromstring(response.content)
        for item in root.findall("item"):
            bgg_id = int(item.attrib["id"])
            image_url = item.findtext("image") or item.findtext("thumbnail")
            if image_url:
                image_urls[bgg_id] = image_url.strip()

        time.sleep(1.1)

    return image_urls


def build_medal_png(content: bytes, size: int, padding: int) -> Image.Image:
    source = Image.open(io.BytesIO(content)).convert("RGBA")
    source = ImageOps.exif_transpose(source)

    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    max_side = size - (padding * 2)
    source.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - source.width) // 2
    y = (size - source.height) // 2
    canvas.alpha_composite(source, (x, y))

    return canvas


if __name__ == "__main__":
    raise SystemExit(main())
