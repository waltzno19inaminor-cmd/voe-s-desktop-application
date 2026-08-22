#!/usr/bin/env python3
"""
Generate Access Keys Script for ExGenesis / J.L.JÖRMUNGANDR
Uses Cloudflare Access Worker Admin Endpoint to issue 3-month (or custom N-day) activation keys.

Usage:
  python3 scripts/generate_access_keys.py --admin-token YOUR_TOKEN [--count 5] [--days 90] [--label "3-month promo"]
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_WORKER_URL = "https://exgenesis-access-worker.waltzno19inaminor.workers.dev"

def main():
    parser = argparse.ArgumentParser(description="Generate 3-month or custom duration access keys.")
    parser.add_argument("--admin-token", help="Cloudflare Worker Admin Token (or set ACCESS_ADMIN_TOKEN env var)")
    parser.add_argument("--url", default=DEFAULT_WORKER_URL, help="Cloudflare Worker base URL")
    parser.add_argument("--count", type=int, default=1, help="Number of keys to generate (1-100, default: 1)")
    parser.add_argument("--days", type=int, default=90, help="Duration in days (default: 90 for 3 months)")
    parser.add_argument("--max-redemptions", type=int, default=1, help="Max redemptions per key (default: 1)")
    parser.add_argument("--label", default="3-month access key", help="Optional label for the key batch")

    args = parser.parse_args()

    token = args.admin_token or os.environ.get("ACCESS_ADMIN_TOKEN")
    if not token:
        print("Error: Admin token is required. Provide --admin-token or set ACCESS_ADMIN_TOKEN environment variable.", file=sys.stderr)
        sys.exit(1)

    endpoint = f"{args.url.rstrip('/')}/v1/admin/keys"
    payload = {
        "count": args.count,
        "durationDays": args.days,
        "maxRedemptions": args.max_redemptions,
        "label": args.label
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
            print(f"\nTotal: {len(keys)} key(s) valid for {args.days} days.")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"HTTP Error {e.code}: {body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Request failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
