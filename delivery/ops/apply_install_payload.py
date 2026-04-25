#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOT = ROOT / "_install_render"


@dataclass
class PlannedCopy:
    source: Path
    target: Path
    backup: Path | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply rendered install payload files into a target root."
    )
    parser.add_argument(
        "--source-root",
        default=str(DEFAULT_SOURCE_ROOT),
        help="Rendered payload root. Default: _install_render",
    )
    parser.add_argument(
        "--target-root",
        required=True,
        help="Root directory that will receive the rendered payload tree.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned backups and copies without writing files.",
    )
    parser.add_argument(
        "--allow-live-root",
        action="store_true",
        help="Allow target-root=/ . Without this flag, applying to / is blocked.",
    )
    return parser.parse_args()


def ensure_source_root(path: Path) -> Path:
    resolved = path.resolve()
    if not resolved.exists():
        raise SystemExit(f"source-root not found: {resolved}")
    if not resolved.is_dir():
        raise SystemExit(f"source-root is not a directory: {resolved}")
    return resolved


def ensure_target_root(path: Path, allow_live_root: bool) -> Path:
    resolved = path.resolve()
    if resolved == Path("/") and not allow_live_root:
        raise SystemExit("target-root=/ is blocked; pass --allow-live-root to override")
    return resolved


def collect_source_files(source_root: Path) -> list[Path]:
    files = sorted(path for path in source_root.rglob("*") if path.is_file())
    if not files:
        raise SystemExit(f"no files found under source-root: {source_root}")
    return files


def plan_operations(source_root: Path, target_root: Path) -> list[PlannedCopy]:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    planned: list[PlannedCopy] = []
    for source in collect_source_files(source_root):
        relative_path = source.relative_to(source_root)
        target = target_root / relative_path
        backup = None
        if target.exists():
            backup = target.with_name(f"{target.name}.bak_{timestamp}")
        planned.append(PlannedCopy(source=source, target=target, backup=backup))
    return planned


def print_summary(planned: list[PlannedCopy], source_root: Path, target_root: Path, dry_run: bool) -> None:
    mode = "dry-run" if dry_run else "apply"
    print(f"mode: {mode}")
    print(f"source root: {source_root}")
    print(f"target root: {target_root}")
    print("planned operations:")
    for item in planned:
        if item.backup is not None:
            print(f"- backup {item.target} -> {item.backup}")
        print(f"- copy {item.source} -> {item.target}")


def apply_operations(planned: list[PlannedCopy]) -> None:
    for item in planned:
        item.target.parent.mkdir(parents=True, exist_ok=True)
        if item.backup is not None:
            shutil.copy2(item.target, item.backup)
        shutil.copy2(item.source, item.target)


def main() -> int:
    args = parse_args()
    source_root = ensure_source_root(Path(args.source_root))
    target_root = ensure_target_root(Path(args.target_root), args.allow_live_root)
    planned = plan_operations(source_root, target_root)
    print_summary(planned, source_root, target_root, args.dry_run)
    if args.dry_run:
        return 0
    apply_operations(planned)
    print("status: completed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
