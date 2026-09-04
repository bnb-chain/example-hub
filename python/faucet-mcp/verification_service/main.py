"""GitHub-based verification service for tBNB payouts.

Verifies builders based on:
- GitHub account exists
- Has at least 1 public repository
- Account age >= 30 days
- Rate limiting: 24 hours between payouts per GitHub user ID
"""

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

load_dotenv()

DB_PATH = Path(os.getenv("DB_PATH", "payouts.db"))
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")  # Optional: increases rate limit from 60 to 5000/hour

app = FastAPI(title="GitHub Verification Service", version="1.0.0")


class VerificationRequest(BaseModel):
    wallet_address: str
    github_username: str
    requester_id: str | None = None
    channel: str | None = None


class VerificationResponse(BaseModel):
    wallet_address: str
    verified: bool
    confidence: float
    reason: str
    github_user_id: int | None = None
    repo_count: int | None = None
    account_age_days: int | None = None
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "wallet_address": "0x1234...",
                    "verified": True,
                    "confidence": 0.95,
                    "reason": "All verification checks passed",
                    "github_user_id": 12345678,
                    "repo_count": 5,
                    "account_age_days": 365,
                }
            ]
        }
    }


def init_database() -> None:
    """Initialize SQLite database with minimal schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS payout_history (
            github_user_id INTEGER PRIMARY KEY,
            last_payout_timestamp TIMESTAMP NOT NULL
        )
    """
    )
    conn.commit()
    conn.close()


def can_collect_tbnb(github_user_id: int) -> tuple[bool, str | None]:
    """
    Check if GitHub user can collect tBNB (24h cooldown).
    Returns: (can_collect, error_message)
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT last_payout_timestamp FROM payout_history WHERE github_user_id = ?",
        (github_user_id,),
    )
    result = cursor.fetchone()
    conn.close()

    if result is None:
        return (True, None)  # First time collecting

    last_payout = datetime.fromisoformat(result[0])
    time_since = datetime.now() - last_payout

    if time_since < timedelta(hours=24):
        hours_remaining = 24 - time_since.total_seconds() / 3600
        return (
            False,
            f"Rate limited. Last payout was {time_since.total_seconds()/3600:.1f}h ago. "
            f"Try again in {hours_remaining:.1f} hours",
        )

    return (True, None)


def record_payout(github_user_id: int) -> None:
    """Record successful payout timestamp for rate limiting."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR REPLACE INTO payout_history 
        (github_user_id, last_payout_timestamp)
        VALUES (?, ?)
    """,
        (github_user_id, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()


def verify_builder(github_username: str, wallet_address: str) -> VerificationResponse:
    """
    Verify builder with GitHub checks + rate limiting.
    """
    # Prepare headers with optional GitHub token for higher rate limits
    headers = {}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    
    # Get GitHub user data
    try:
        user_resp = requests.get(
            f"https://api.github.com/users/{github_username}",
            headers=headers,
            timeout=10,
        )
        if user_resp.status_code != 200:
            return VerificationResponse(
                wallet_address=wallet_address,
                verified=False,
                confidence=0.0,
                reason=f"GitHub account not found (status: {user_resp.status_code})",
            )
    except requests.RequestException as exc:
        return VerificationResponse(
            wallet_address=wallet_address,
            verified=False,
            confidence=0.0,
            reason=f"Failed to reach GitHub API: {exc}",
        )

    user_data = user_resp.json()
    github_user_id_raw = user_data.get("id")
    # Ensure github_user_id is an integer (GitHub API returns int, but ensure type safety)
    github_user_id = int(github_user_id_raw) if github_user_id_raw is not None else None
    repo_count = user_data.get("public_repos", 0)

    # Check repo count
    if repo_count < 1:
        return VerificationResponse(
            wallet_address=wallet_address,
            verified=False,
            confidence=0.0,
            reason="No public repositories",
            github_user_id=github_user_id,
            repo_count=0,
        )

    # Check account age (30 days)
    created_at_str = user_data.get("created_at", "")
    if created_at_str:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - created_at).days
        if age_days < 30:
            return VerificationResponse(
                wallet_address=wallet_address,
                verified=False,
                confidence=0.0,
                reason=f"Account too new ({age_days} days, need 30+)",
                github_user_id=github_user_id,
                repo_count=repo_count,
                account_age_days=age_days,
            )
    else:
        age_days = None

    # Check rate limit using GitHub user ID
    can_collect, rate_limit_msg = can_collect_tbnb(github_user_id)
    if not can_collect:
        return VerificationResponse(
            wallet_address=wallet_address,
            verified=False,
            confidence=0.0,
            reason=rate_limit_msg or "Rate limited",
            github_user_id=github_user_id,
            repo_count=repo_count,
            account_age_days=age_days,
        )

    # All checks passed
    confidence = min(1.0, 0.7 + (repo_count * 0.05))
    return VerificationResponse(
        wallet_address=wallet_address,
        verified=True,
        confidence=confidence,
        reason="All verification checks passed",
        github_user_id=github_user_id,
        repo_count=repo_count,
        account_age_days=age_days,
    )


@app.on_event("startup")
def startup_event() -> None:
    """Initialize database on startup."""
    init_database()


@app.get("/health")
def health() -> dict[str, str]:
    """Simple health endpoint for container/runtime checks."""
    return {"status": "ok"}


@app.post("/verify", response_model=VerificationResponse)
def verify_wallet(payload: VerificationRequest) -> VerificationResponse:
    """Verify wallet request with GitHub checks."""
    if not payload.github_username:
        raise HTTPException(
            status_code=400, detail="github_username is required for verification"
        )

    return verify_builder(payload.github_username, payload.wallet_address)


class RecordPayoutRequest(BaseModel):
    github_user_id: int


@app.post("/record-payout")
def record_payout_endpoint(payload: RecordPayoutRequest) -> dict[str, str | int]:
    """Record successful payout for rate limiting."""
    record_payout(payload.github_user_id)
    return {"status": "recorded", "github_user_id": payload.github_user_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)

