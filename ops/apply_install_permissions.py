#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import pwd
import grp
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "ops" / "install_permissions.json"


@dataclass
class PermissionEntry:
    path: Path
    owner: str
    group: str
    mode: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply owner/group/mode policy to rendered install payload files."
    )
    parser.add_argument(
        "--manifest",
        default=str(DEFAULT_MANIFEST),
        help="Permission manifest JSON file.",
    )
    parser.add_argument(
        "--target-root",
        required=True,
        help="Root directory containing the rendered payload tree.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned owner/group/mode changes without writing.",
    )
    parser.add_argument(
        "--allow-live-root",
        action="store_true",
        help="Allow target-root=/ . Without this flag, applying to / is blocked.",
    )
    return parser.parse_args()


def ensure_target_root(path: Path, allow_live_root: bool) -> Path:
    resolved = path.resolve()
    if resolved == Path("/") and not allow_live_root:
        raise SystemExit("target-root=/ is blocked; pass --allow-live-root to override")
    return resolved


def load_manifest(path: Path) -> list[PermissionEntry]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"manifest not found: {path}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"manifest is not valid JSON: {path}: {exc}")

    if not isinstance(data, list):
        raise SystemExit(f"manifest must be a JSON array: {path}")

    entries: list[PermissionEntry] = []
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            raise SystemExit(f"manifest entry {idx} must be an object")
        for key in ("path", "owner", "group", "mode"):
            if key not in item or not isinstance(item[key], str) or not item[key]:
                raise SystemExit(f"manifest entry {idx} missing valid '{key}'")
        try:
            int(item["mode"], 8)
        except ValueError:
            raise SystemExit(f"manifest entry {idx} has invalid mode: {item['mode']}")
        entries.append(
            PermissionEntry(
                path=Path(item["path"]),
                owner=item["owner"],
                group=item["group"],
                mode=item["mode"],
            )
        )
    return entries


def validate_entries(entries: list[PermissionEntry], target_root: Path) -> list[tuple[PermissionEntry, Path]]:
    planned: list[tuple[PermissionEntry, Path]] = []
    for entry in entries:
        target = target_root / entry.path
        if not target.parent.exists():
            raise SystemExit(f"parent directory missing: {target.parent}")
        if not target.exists():
            raise SystemExit(f"target file missing: {target}")
        if not target.is_file():
            raise SystemExit(f"target path is not a file: {target}")
        try:
            pwd.getpwnam(entry.owner)
        except KeyError:
            raise SystemExit(f"owner not found on this system: {entry.owner}")
        try:
            grp.getgrnam(entry.group)
        except KeyError:
            raise SystemExit(f"group not found on this system: {entry.group}")
        planned.append((entry, target))
    return planned


def print_summary(planned: list[tuple[PermissionEntry, Path]], manifest_path: Path, target_root: Path, dry_run: bool) -> None:
    mode = "dry-run" if dry_run else "apply"
    print(f"mode: {mode}")
    print(f"manifest: {manifest_path}")
    print(f"target root: {target_root}")
    print("planned permission operations:")
    for entry, target in planned:
        print(f"- {target}: owner={entry.owner} group={entry.group} mode={entry.mode}")


def verify_permissions(planned: list[tuple[PermissionEntry, Path]]) -> None:
    mismatches: list[str] = []
    for entry, target in planned:
        st = target.stat()
        actual_owner = pwd.getpwuid(st.st_uid).pw_name
        actual_group = grp.getgrgid(st.st_gid).gr_name
        actual_mode = format(st.st_mode & 0o7777, "04o")
        if (
            actual_owner != entry.owner
            or actual_group != entry.group
            or actual_mode != entry.mode
        ):
            mismatches.append(
                f"{target}: expected {entry.owner}:{entry.group} {entry.mode}, "
                f"got {actual_owner}:{actual_group} {actual_mode}"
            )
    if mismatches:
        raise SystemExit("permission verification failed:\n" + "\n".join(mismatches))


def apply_permissions(planned: list[tuple[PermissionEntry, Path]]) -> None:
    for entry, target in planned:
        uid = pwd.getpwnam(entry.owner).pw_uid
        gid = grp.getgrnam(entry.group).gr_gid
        os.chown(target, uid, gid)
        os.chmod(target, int(entry.mode, 8))
    verify_permissions(planned)


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest).resolve()
    target_root = ensure_target_root(Path(args.target_root), args.allow_live_root)
    entries = load_manifest(manifest_path)
    planned = validate_entries(entries, target_root)
    print_summary(planned, manifest_path, target_root, args.dry_run)
    if args.dry_run:
        return 0
    apply_permissions(planned)
    print("status: completed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
