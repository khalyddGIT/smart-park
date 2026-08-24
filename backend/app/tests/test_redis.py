"""Tests de Redis (cache, rate limit, blacklist JWT, pub/sub) usando fakeredis.

Monkeypatchean get_client() para ejercitar los caminos reales de Redis sin servidor.
"""
import pytest
from fastapi import HTTPException
from fakeredis import aioredis as fakeredis_aio

from app.core import cache
from app.core.security import create_access_token
from app.core.security import get_current_user


@pytest.fixture
def fake_redis(monkeypatch):
    client = fakeredis_aio.FakeRedis(decode_responses=True)
    monkeypatch.setattr(cache, "get_client", lambda: client)
    return client


def test_cache_roundtrip(fake_redis):
    import asyncio
    async def run():
        await cache.cache_set_json("k1", {"a": 1, "b": "x"}, ttl=60)
        val = await cache.cache_get_json("k1")
        assert val == {"a": 1, "b": "x"}
        await cache.cache_delete("k1")
        assert await cache.cache_get_json("k1") is None
    asyncio.run(run())


def test_rate_limit_blocks_after_limit(fake_redis):
    import asyncio
    async def run():
        results = []
        for _ in range(7):
            allowed, count = await cache.rate_limit_hit("rl:test", limit=5, window=60)
            results.append(allowed)
        # Primeros 5 permitidos, 6 y 7 bloqueados
        assert results == [True, True, True, True, True, False, False]
    asyncio.run(run())


def test_blacklist_revokes_token(fake_redis):
    import asyncio
    async def run():
        token = create_access_token(subject=1)
        from jose import jwt as jose_jwt
        from app.core.config import settings
        payload = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload["jti"]

        # Sin blacklist: válido (get_current_user fallará por DB vacía, NO por token revocado)
        from app.db.session import get_db
        db_gen = get_db()
        db = await db_gen.__anext__()
        try:
            await get_current_user(credentials=None, db=db)  # type: ignore
        except HTTPException as e:
            assert e.detail != "Token revocado: la sesión fue cerrada"

        # Revocar y verificar que ahora sí es rechazado por revocación
        assert await cache.blacklist_token(jti, ttl_seconds=60) is True
        assert await cache.is_blacklisted(jti) is True

        class FakeCreds:
            credentials = token
        with pytest.raises(HTTPException) as exc:
            await get_current_user(credentials=FakeCreds(), db=db)
        assert "revocado" in exc.value.detail.lower()
    asyncio.run(run())


def test_fail_open_without_redis(monkeypatch):
    """Sin Redis (get_client -> None): rate limit permite y blacklist no revoca."""
    import asyncio
    monkeypatch.setattr(cache, "get_client", lambda: None)
    async def run():
        allowed, _ = await cache.rate_limit_hit("rl:x", limit=1, window=60)
        assert allowed is True
        assert await cache.blacklist_token("jti-x", 60) is False
        assert await cache.is_blacklisted("jti-x") is False
        assert await cache.cache_get_json("k") is None
    asyncio.run(run())
