from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
import zipfile
from pathlib import Path
from urllib.parse import urlparse

import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

OUT = Path("wall-source-artifact")
OUT.mkdir(parents=True, exist_ok=True)
STATUS: list[dict] = []
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36"

PMC = [
    ("01_modular_fortresses_dannypan", "https://www.planetminecraft.com/project/modular-fortresses-schematic-pack-1-21-5-axiom-blueprints-vanilla-friendly-free/"),
    ("02_modular_city_walls_whisterria", "https://www.planetminecraft.com/project/modular-city-walls-repository/"),
    ("03_medieval_wall_pack", "https://www.planetminecraft.com/project/medieval-wall-pack-schematics/"),
    ("04_castle_bits_and_pieces", "https://www.planetminecraft.com/project/castle-bits-and-pieces-gatehouse-walls-towers-and-more/"),
    ("05_fortified_walls_bits_pieces", "https://www.planetminecraft.com/project/fortified-walls-nearly-seemless-bits-amp-pieces/"),
]

ABFIELDER = [
    ("abfielder_small_stone_castle.litematic", "https://abfielder.com/Partners/PartnerUploadedFiles/9ce48a3ebcb3_SmallCastle.litematic"),
    ("abfielder_medieval_castle.litematic", "https://abfielder.com/Partners/PartnerUploadedFiles/85e7b2af451a_MedievalCastle.litematic"),
    ("abfielder_sakura_castle.litematic", "https://abfielder.com/Partners/PartnerUploadedFiles/3df7fde0dc65_Sakura%20Castle.litematic"),
    ("abfielder_castle_gate.litematic", "https://abfielder.com/Partners/PartnerUploadedFiles/f637ba8f622d_CastleEnterance.litematic"),
    ("abfielder_medieval_castle_empty.litematic", "https://abfielder.com/Partners/PartnerUploadedFiles/6f3a072bea3e_castle.litematic"),
]


def valid_binary(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 128:
        return False
    head = path.read_bytes()[:256].lower()
    return not (b"<html" in head or b"<!doctype" in head or b"access denied" in head)


def save_response(resp: requests.Response, path: Path) -> bool:
    path.write_bytes(resp.content)
    return valid_binary(path)


def request_download(url: str, path: Path, referer: str | None = None) -> tuple[bool, str]:
    headers = {"User-Agent": UA, "Accept": "*/*"}
    if referer:
        headers["Referer"] = referer
    try:
        with requests.Session() as s:
            r = s.get(url, headers=headers, timeout=90, allow_redirects=True)
            ok = save_response(r, path)
            return ok, f"status={r.status_code} final={r.url} bytes={len(r.content)} type={r.headers.get('content-type')}"
    except Exception as e:
        return False, repr(e)


def download_pmc(browser, slug: str, url: str) -> None:
    dest_dir = OUT / slug
    dest_dir.mkdir(parents=True, exist_ok=True)
    page = browser.new_page(user_agent=UA, accept_downloads=True)
    record = {"name": slug, "source": url, "method": "playwright", "ok": False}
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(2500)
        # Dismiss common overlays when present.
        for text in ["Accept", "I Agree", "Got it", "Close"]:
            try:
                page.get_by_text(text, exact=True).first.click(timeout=1200)
            except Exception:
                pass

        candidates = [
            page.get_by_role("link", name=re.compile(r"Download Minecraft Map", re.I)),
            page.get_by_role("link", name=re.compile(r"Download", re.I)),
            page.locator('a[href*="/download/"]'),
        ]
        clicked = False
        for locator in candidates:
            try:
                if locator.count() < 1:
                    continue
                with page.expect_download(timeout=30000) as info:
                    locator.first.click()
                dl = info.value
                filename = dl.suggested_filename or f"{slug}.bin"
                target = dest_dir / filename
                dl.save_as(str(target))
                if valid_binary(target):
                    record.update(ok=True, file=str(target), bytes=target.stat().st_size)
                    clicked = True
                    break
            except PlaywrightTimeoutError:
                # Some PMC buttons navigate to a download endpoint instead of emitting a browser download.
                try:
                    href = locator.first.get_attribute("href")
                    if href:
                        full = href if href.startswith("http") else "https://www.planetminecraft.com" + href
                        ok, detail = request_download(full, dest_dir / f"{slug}_request.bin", referer=url)
                        record["request_detail"] = detail
                        if ok:
                            record.update(ok=True, file=str(dest_dir / f"{slug}_request.bin"), bytes=(dest_dir / f"{slug}_request.bin").stat().st_size)
                            clicked = True
                            break
                except Exception:
                    pass
            except Exception as e:
                record.setdefault("errors", []).append(repr(e))
        if not clicked:
            # Preserve page HTML and all download-like hrefs for diagnosis.
            (dest_dir / "page.html").write_text(page.content(), encoding="utf-8")
            hrefs = page.locator('a[href*="download"]').evaluate_all("els => els.map(e => e.href)")
            (dest_dir / "download_links.json").write_text(json.dumps(hrefs, indent=2), encoding="utf-8")
            record["download_links"] = hrefs
    except Exception as e:
        record["error"] = repr(e)
    finally:
        page.close()
        STATUS.append(record)


def inspect_archives() -> None:
    listing = []
    exts = {".schem", ".schematic", ".litematic", ".bp", ".nbt", ".mcstructure", ".zip"}
    for p in OUT.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            listing.append({"path": str(p.relative_to(OUT)), "bytes": p.stat().st_size, "suffix": p.suffix.lower()})
            if p.suffix.lower() == ".zip":
                try:
                    extract_dir = p.with_suffix("")
                    extract_dir.mkdir(exist_ok=True)
                    with zipfile.ZipFile(p) as zf:
                        zf.extractall(extract_dir)
                except Exception as e:
                    listing[-1]["extract_error"] = repr(e)
    (OUT / "binary_inventory.json").write_text(json.dumps(listing, indent=2), encoding="utf-8")


def main() -> None:
    # Open-license Axiom blueprint pack, used as an additional fallback corpus.
    github_zip = OUT / "kirotsuky_community_blueprint_pack.zip"
    ok, detail = request_download(
        "https://github.com/Kirotsuky/Community-Blueprint-Pack/archive/refs/heads/main.zip",
        github_zip,
    )
    STATUS.append({"name": "Kirotsuky Community Blueprint Pack", "source": "GitHub", "ok": ok, "detail": detail})
    lic = OUT / "KIROTSUKY_LICENSE.txt"
    ok_lic, detail_lic = request_download(
        "https://raw.githubusercontent.com/Kirotsuky/Community-Blueprint-Pack/main/LICENSE",
        lic,
    )
    STATUS.append({"name": "Kirotsuky license", "ok": ok_lic, "detail": detail_lic})

    for name, url in ABFIELDER:
        path = OUT / name
        ok, detail = request_download(url, path, referer="https://abfielder.com/")
        STATUS.append({"name": name, "source": url, "ok": ok, "detail": detail, "bytes": path.stat().st_size if path.exists() else 0})
        if not ok and path.exists():
            path.rename(path.with_suffix(path.suffix + ".failed"))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
        for slug, url in PMC:
            download_pmc(browser, slug, url)
        browser.close()

    inspect_archives()
    (OUT / "fetch_status.json").write_text(json.dumps(STATUS, indent=2, ensure_ascii=False), encoding="utf-8")
    success = sum(1 for x in STATUS if x.get("ok"))
    (OUT / "README.txt").write_text(
        f"Automated wall source fetch. Successful records: {success}/{len(STATUS)}\n"
        "See fetch_status.json and binary_inventory.json.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
