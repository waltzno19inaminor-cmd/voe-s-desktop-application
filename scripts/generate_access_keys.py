#!/usr/bin/env python3
"""
Generate Access Keys Script for ExGenesis / J.L.JÖRMUNGANDR
Uses Cloudflare Access Worker Admin Endpoint to issue activation keys whose
license period starts only when the recipient activates the key.

Usage:
  python3 scripts/generate_access_keys.py --admin-token YOUR_TOKEN --plan 3m --count 5
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_WORKER_URL = "https://exgenesis-access-worker.waltzno19inaminor.workers.dev"

def main():
    parser = argparse.ArgumentParser(description="Generate manual access keys.")
    parser.add_argument("--admin-token", help="Cloudflare Worker Admin Token (or set ACCESS_ADMIN_TOKEN env var)")
    parser.add_argument("--url", default=DEFAULT_WORKER_URL, help="Cloudflare Worker base URL")
    parser.add_argument("--count", type=int, default=1, help="Number of keys to generate (1-100, default: 1)")
    parser.add_argument("--plan", choices=["1m", "3m", "6m", "1y", "5y", "lifetime"], default="3m", help="License plan (default: 3m)")
    parser.add_argument("--max-redemptions", type=int, default=1, help="Max redemptions per key (default: 1)")
    parser.add_argument("--label", default="", help="Optional label for the key batch")

    args = parser.parse_args()

    token = args.admin_token or os.environ.get("ACCESS_ADMIN_TOKEN")
    if not token:
        print("Error: Admin token is required. Provide --admin-token or set ACCESS_ADMIN_TOKEN environment variable.", file=sys.stderr)
        sys.exit(1)

    endpoint = f"{args.url.rstrip('/')}/v1/admin/keys"
    payload = {
        "count": args.count,
        "plan": args.plan,
        "maxRedemptions": args.max_redemptions,
        "label": args.label or f"manual-{args.plan}"
    }

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Access-Admin-Token": token
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            response_data = json.loads(resp.read().decode("utf-8"))
            print("Successfully generated access keys:\n")
            keys = response_data.get("keys", [])
            for item in keys:
                print(f"Key ID: {item.get('id')}  |  Key: {item.get('key')}")
            print(f"\nTotal: {len(keys)} key(s). The {args.plan} license period starts on activation.")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"HTTP Error {e.code}: {body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Request failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
