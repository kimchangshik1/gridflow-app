#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import pwd
import grp
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_KEYS = (
    "APP_DIR",
    "VENV_PYTHON",
    "APP_USER",
    "APP_GROUP",
    "BOT_USER",
    "MONITOR_USER",
    "MONITOR_GROUP",
    "DB_URL",
    "MONITOR_EXCHANGE",
    "MONITOR_API_KEY",
    "MONITOR_API_SECRET",
    "MONITOR_PASSWORD_HASH",
)

REQUIRED_COMMANDS = (
    "python3",
    "systemctl",
    "nginx",
    "curl",
)

REQUIRED_REPO_FILES = (
    "ops/apply_install_payload.py",
    "ops/apply_install_permissions.py",
    "ops/post_install_activate.sh",
    "ops/post_install_smoke_check.sh",
    "ops/install_permissions.json",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read-only preflight checker for install values and local system prerequisites."
    )
    parser.add_argument(
        "--values",
        required=True,
        help="Path to install values JSON file.",
    )
    return parser.parse_args()


def load_values(path: Path) -> dict[str, str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"values file not found: {path}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"values file is not valid JSON: {path}: {exc}")
    if not isinstance(data, dict):
        raise SystemExit(f"values file must be a JSON object: {path}")
    return {str(k): "" if v is None else str(v) for k, v in data.items()}


def pass_line(label: str, detail: str) -> None:
    print(f"PASS {label}: {detail}")


def fail_line(label: str, detail: str) -> None:
    print(f"FAIL {label}: {detail}")


def main() -> int:
    args = parse_args()
    values_path = Path(args.values).resolve()
    failures = 0

    if values_path.exists():
        pass_line("values file", str(values_path))
    else:
        fail_line("values file", f"missing: {values_path}")
        print("overall: FAIL")
        return 1

    values = load_values(values_path)

    for key in REQUIRED_KEYS:
        if key not in values:
            fail_line(f"required key {key}", "missing")
            failures += 1
        elif not values[key].strip():
            fail_line(f"required key {key}", "empty")
            failures += 1
        else:
            pass_line(f"required key {key}", "present")

    app_dir = Path(values.get("APP_DIR", ""))
    if app_dir.exists():
        pass_line("APP_DIR exists", str(app_dir))
    else:
        fail_line("APP_DIR exists", str(app_dir))
        failures += 1

    venv_python = Path(values.get("VENV_PYTHON", ""))
    if venv_python.exists():
        pass_line("VENV_PYTHON exists", str(venv_python))
    else:
        fail_line("VENV_PYTHON exists", str(venv_python))
        failures += 1
    if venv_python.exists() and os.access(venv_python, os.X_OK):
        pass_line("VENV_PYTHON executable", str(venv_python))
    else:
        fail_line("VENV_PYTHON executable", str(venv_python))
        failures += 1

    for user_key in ("APP_USER", "BOT_USER", "MONITOR_USER"):
        user_name = values.get(user_key, "")
        try:
            pwd.getpwnam(user_name)
            pass_line(f"user {user_key}", user_name)
        except KeyError:
            fail_line(f"user {user_key}", user_name or "missing")
            failures += 1

    for group_key in ("APP_GROUP", "MONITOR_GROUP"):
        group_name = values.get(group_key, "")
        try:
            grp.getgrnam(group_name)
            pass_line(f"group {group_key}", group_name)
        except KeyError:
            fail_line(f"group {group_key}", group_name or "missing")
            failures += 1

    for cmd in REQUIRED_COMMANDS:
        found = shutil.which(cmd)
        if found:
            pass_line(f"command {cmd}", found)
        else:
            fail_line(f"command {cmd}", "not found")
            failures += 1

    for rel_path in REQUIRED_REPO_FILES:
        target = ROOT / rel_path
        if target.exists():
            pass_line(f"repo file {rel_path}", str(target))
        else:
            fail_line(f"repo file {rel_path}", "missing")
            failures += 1

    overall = "PASS" if failures == 0 else "FAIL"
    print(f"overall: {overall}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
