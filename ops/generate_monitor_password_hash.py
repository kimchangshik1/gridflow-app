#!/usr/bin/env python3
from __future__ import annotations

import argparse
import getpass
import sys

import bcrypt


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a bcrypt password hash for monitor_auth.json."
    )
    parser.add_argument(
        "--password",
        help="Plain-text password to hash. If omitted, the script reads from stdin or an interactive prompt.",
    )
    return parser.parse_args()


def read_password(args: argparse.Namespace) -> str:
    if args.password is not None:
        return args.password
    if not sys.stdin.isatty():
        return sys.stdin.read().rstrip("\r\n")
    return getpass.getpass("Monitor password: ")


def main() -> int:
    args = parse_args()
    password = read_password(args)
    if not password:
        raise SystemExit("password must not be empty")

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    print(hashed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
