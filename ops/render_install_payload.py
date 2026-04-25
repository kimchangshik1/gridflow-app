#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / "ops" / "templates"
DEFAULT_VALUES = TEMPLATE_DIR / "install_values.example.json"
DEFAULT_OUTPUT_DIR = ROOT / "_install_render"

PLACEHOLDER_RE = re.compile(r"\{\{([A-Z0-9_]+)\}\}")

TEMPLATE_OUTPUTS = {
    TEMPLATE_DIR / "gridflow-app.service": Path("etc/systemd/system/gridflow-app.service"),
    TEMPLATE_DIR / "upbit-bot.service": Path("etc/systemd/system/upbit-bot.service"),
    TEMPLATE_DIR / "orderlens-ops.service": Path("etc/systemd/system/orderlens-ops.service"),
    TEMPLATE_DIR / "gridflow-pg-backup.service": Path("etc/systemd/system/gridflow-pg-backup.service"),
    TEMPLATE_DIR / "gridflow-pg-backup.timer": Path("etc/systemd/system/gridflow-pg-backup.timer"),
    TEMPLATE_DIR / "gridflow-health-alert.service": Path("etc/systemd/system/gridflow-health-alert.service"),
    TEMPLATE_DIR / "gridflow-health-alert.timer": Path("etc/systemd/system/gridflow-health-alert.timer"),
    TEMPLATE_DIR / "nginx.gridflow.conf": Path("etc/nginx/sites-available/gridflow"),
    TEMPLATE_DIR / "gridflow.logrotate": Path("etc/logrotate.d/gridflow"),
    TEMPLATE_DIR / "gridflow.env.template": Path("etc/gridflow/gridflow.env"),
    TEMPLATE_DIR / "monitor_config.json.template": Path("etc/gridflow/monitor_config.json"),
    TEMPLATE_DIR / "monitor_auth.json.template": Path("etc/gridflow/monitor_auth.json"),
}

REQUIRED_KEYS = {
    "APP_DIR",
    "VENV_PYTHON",
    "ENV_FILE",
    "CONFIG_DIR",
    "APP_USER",
    "APP_GROUP",
    "BOT_USER",
    "MONITOR_USER",
    "MONITOR_GROUP",
    "MONITOR_CONFIG_PATH",
    "MONITOR_AUTH_PATH",
    "APP_BIND_HOST",
    "APP_BIND_PORT",
    "MONITOR_BIND_HOST",
    "MONITOR_BIND_PORT",
    "MONITOR_LOG_FILE",
    "SERVER_NAME",
    "NGINX_HTTP_PORT",
    "NGINX_HTTPS_PORT",
    "SSL_CERT_PATH",
    "SSL_KEY_PATH",
    "DB_URL",
    "MONITOR_EXCHANGE",
    "MONITOR_API_KEY",
    "MONITOR_API_SECRET",
    "MONITOR_PASSWORD_HASH",
}

OPTIONAL_KEYS = {
    "DRY_RUN",
    "JWT_SECRET",
    "GRIDFLOW_ALERT_WEBHOOK_URL",
    "MONITOR_TIER",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render install payload files from repo templates into a repo-local output directory."
    )
    parser.add_argument(
        "--values",
        default=str(DEFAULT_VALUES),
        help="Path to JSON file containing placeholder values.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Repo-local directory where rendered files will be written.",
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
        raise SystemExit(f"values file must be a flat JSON object: {path}")

    normalized: dict[str, str] = {}
    for key, value in data.items():
        if not isinstance(key, str):
            raise SystemExit("values file keys must be strings")
        if isinstance(value, bool):
            normalized[key] = "true" if value else "false"
        elif value is None:
            normalized[key] = ""
        else:
            normalized[key] = str(value)
    return normalized


def collect_placeholders() -> dict[Path, set[str]]:
    template_keys: dict[Path, set[str]] = {}
    for template_path in TEMPLATE_OUTPUTS:
        text = template_path.read_text(encoding="utf-8")
        template_keys[template_path] = set(PLACEHOLDER_RE.findall(text))
    return template_keys


def validate_values(values: dict[str, str], template_keys: dict[Path, set[str]]) -> list[str]:
    used_keys = set().union(*template_keys.values())
    unknown_placeholders = used_keys - REQUIRED_KEYS - OPTIONAL_KEYS
    if unknown_placeholders:
        unknown = ", ".join(sorted(unknown_placeholders))
        raise SystemExit(f"unknown placeholders found in templates: {unknown}")

    missing_keys = sorted(key for key in used_keys if key not in values)
    if missing_keys:
        raise SystemExit("missing placeholder values: " + ", ".join(missing_keys))

    empty_required = sorted(key for key in REQUIRED_KEYS if key in used_keys and not values.get(key, "").strip())
    if empty_required:
        raise SystemExit("required placeholder values are empty: " + ", ".join(empty_required))

    return sorted(used_keys)


def render_template(text: str, values: dict[str, str]) -> str:
    def replacer(match: re.Match[str]) -> str:
        key = match.group(1)
        return values[key]

    return PLACEHOLDER_RE.sub(replacer, text)


def write_outputs(output_dir: Path, values: dict[str, str]) -> list[tuple[Path, Path]]:
    rendered: list[tuple[Path, Path]] = []
    for template_path, relative_output in TEMPLATE_OUTPUTS.items():
        target_path = output_dir / relative_output
        target_path.parent.mkdir(parents=True, exist_ok=True)
        rendered_text = render_template(template_path.read_text(encoding="utf-8"), values)
        target_path.write_text(rendered_text, encoding="utf-8")
        rendered.append((template_path.relative_to(ROOT), target_path.relative_to(ROOT)))
    return rendered


def main() -> int:
    args = parse_args()
    values_path = Path(args.values).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not str(output_dir).startswith(str(ROOT)):
        raise SystemExit(f"output-dir must stay inside repo root: {ROOT}")

    values = load_values(values_path)
    template_keys = collect_placeholders()
    used_keys = validate_values(values, template_keys)
    rendered = write_outputs(output_dir, values)

    print(f"values file: {values_path.relative_to(ROOT)}")
    print(f"output dir: {output_dir.relative_to(ROOT)}")
    print("rendered files:")
    for template_rel, output_rel in rendered:
        print(f"- {template_rel} -> {output_rel}")
    print("used placeholders:")
    for key in used_keys:
        tag = "required" if key in REQUIRED_KEYS else "optional"
        print(f"- {key} ({tag})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
