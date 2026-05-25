"""Background cleanup for expiring old chat messages."""

import asyncio
from contextlib import suppress

from sqlalchemy import text

from app.database.session import SessionLocal

MESSAGE_CLEANUP_SQL = """
DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '21 days';
"""


def cleanup_expired_messages() -> int:
    db = SessionLocal()
    try:
        result = db.execute(text(MESSAGE_CLEANUP_SQL))
        db.commit()
        return result.rowcount or 0
    finally:
        db.close()


async def run_message_cleanup_scheduler(interval_seconds: int = 86_400) -> None:
    while True:
        with suppress(Exception):
            cleanup_expired_messages()
        await asyncio.sleep(interval_seconds)
