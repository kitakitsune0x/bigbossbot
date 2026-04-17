from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request

ROOT_DIR = Path(__file__).resolve().parent.parent
VENDOR_BACKEND = ROOT_DIR / "intel-vendor" / "backend"
if str(VENDOR_BACKEND) not in sys.path:
    sys.path.insert(0, str(VENDOR_BACKEND))

from services.carrier_tracker import start_carrier_tracker, stop_carrier_tracker
from services.data_fetcher import get_latest_data, start_scheduler, stop_scheduler
from services.fetchers._store import get_source_timestamps_snapshot
from services.mesh.mesh_dm_relay import dm_relay
from services.mesh.mesh_metrics import snapshot as mesh_metrics_snapshot
from services.mesh.mesh_router import mesh_router
from services.mesh.mesh_wormhole_contacts import (
    delete_wormhole_dm_contact,
    list_wormhole_dm_contacts,
    upsert_wormhole_dm_contact,
)
from services.wormhole_settings import read_wormhole_settings, write_wormhole_settings
from services.wormhole_supervisor import (
    connect_wormhole,
    disconnect_wormhole,
    get_wormhole_state,
    restart_wormhole,
)

from workspaces import (
    WORKSPACES,
    item_coordinates,
    matches_workspace_bounds,
    matches_workspace_text,
    parse_workspace,
)

logging.basicConfig(level=os.environ.get("INTEL_LOG_LEVEL", "INFO"))
logger = logging.getLogger("bigboss.intel")

SUPPORTED_FEEDS = {
    "news",
    "flights",
    "ships",
    "markets",
    "polymarket",
    "fires",
    "satellites",
    "earthquakes",
    "internet-outages",
    "sigint",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        start_scheduler()
        logger.info("intel scheduler started")
    except Exception:
        logger.exception("intel scheduler start failed")

    try:
        start_carrier_tracker()
        logger.info("carrier tracker started")
    except Exception:
        logger.exception("carrier tracker start failed")

    yield

    try:
        stop_scheduler()
    except Exception:
        logger.exception("intel scheduler stop failed")

    try:
        stop_carrier_tracker()
    except Exception:
        logger.exception("carrier tracker stop failed")


app = FastAPI(title="BigBossBot Intel Service", lifespan=lifespan)


def _shared_secret() -> str:
    return str(os.environ.get("INTEL_SHARED_SECRET", "") or "").strip()


async def require_internal_actor(request: Request) -> dict[str, Any]:
    secret = _shared_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="intel_shared_secret_not_configured")

    timestamp = str(request.headers.get("x-bigboss-timestamp", "") or "").strip()
    encoded_meta = str(request.headers.get("x-bigboss-meta", "") or "").strip()
    presented = str(request.headers.get("x-bigboss-signature", "") or "").strip().lower()
    if not timestamp or not encoded_meta or not presented:
        raise HTTPException(status_code=401, detail="missing_internal_auth")

    try:
        ts_value = int(timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="invalid_internal_timestamp") from exc

    if abs(int(time.time() * 1000) - ts_value) > 5 * 60 * 1000:
        raise HTTPException(status_code=401, detail="stale_internal_timestamp")

    body_bytes = await request.body()
    signing_input = "\n".join(
        [
            timestamp,
            request.method.upper(),
            request.url.path,
            request.url.query or "",
            encoded_meta,
        ]
    ).encode("utf-8") + b"\n" + body_bytes

    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, presented):
        raise HTTPException(status_code=401, detail="invalid_internal_signature")

    try:
        decoded = base64.b64decode(encoded_meta.encode("utf-8")).decode("utf-8")
        actor = json.loads(decoded)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="invalid_internal_actor") from exc

    if not isinstance(actor, dict):
        raise HTTPException(status_code=401, detail="invalid_internal_actor")

    return actor


def _ensure_role(actor: dict[str, Any], *roles: str) -> None:
    role = str(actor.get("role", "") or "").strip().lower()
    if role not in roles:
        raise HTTPException(status_code=403, detail="forbidden")


def _coerce_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_news_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": str(item.get("title", "") or ""),
        "link": str(item.get("link", "") or ""),
        "source": str(item.get("source", "") or ""),
        "pubDate": str(item.get("published", "") or ""),
        "riskScore": item.get("risk_score"),
        "coords": item.get("coords"),
        "clusterCount": int(item.get("cluster_count", 1) or 1),
    }


def _normalize_flight_item(item: dict[str, Any]) -> dict[str, Any]:
    aircraft_type = str(item.get("model", "") or item.get("aircraft_model", "") or "")
    military_type = str(item.get("military_type", "") or item.get("uav_type", "") or item.get("type", "") or "")
    speed = _coerce_float(item.get("speed_knots")) or 0.0
    altitude = _coerce_float(item.get("alt")) or 0.0
    heading = _coerce_float(item.get("heading")) or 0.0
    return {
        "icao24": str(item.get("icao24", "") or ""),
        "callsign": str(item.get("callsign", "") or ""),
        "origin": str(item.get("country", "") or item.get("force", "") or "Unknown"),
        "lat": _coerce_float(item.get("lat")),
        "lon": _coerce_float(item.get("lng")),
        "altitude": round(altitude),
        "heading": round(heading),
        "speed": round(speed),
        "type": military_type or aircraft_type or "Tracked aircraft",
        "aircraftType": aircraft_type,
        "registration": str(item.get("registration", "") or ""),
        "description": str(item.get("force", "") or ""),
        "squawk": str(item.get("squawk", "") or ""),
        "isMilitary": str(item.get("type", "") or "") != "uav",
        "isInteresting": bool(item.get("alert_category")),
    }


def _normalize_ship_item(item: dict[str, Any]) -> dict[str, Any]:
    lat = _coerce_float(item.get("lat"))
    lon = _coerce_float(item.get("lng"))
    return {
        "name": str(item.get("name", "") or item.get("ship_name", "") or "Unknown Vessel"),
        "hull": str(item.get("hull", "") or item.get("mmsi", "") or ""),
        "type": str(item.get("type", "") or item.get("ship_type", "") or "Vessel"),
        "class": str(item.get("class", "") or ""),
        "navy": str(item.get("navy", "") or item.get("flag", "") or item.get("country", "") or "Unknown"),
        "lat": lat,
        "lon": lon,
        "status": str(item.get("status", "") or "Tracked"),
        "region": str(item.get("region", "") or item.get("area", "") or ""),
        "group": str(item.get("group", "") or ""),
    }


def _normalize_stock_map(stocks: dict[str, Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for symbol, payload in stocks.items():
        if not isinstance(payload, dict):
            continue
        price = _coerce_float(payload.get("price")) or 0.0
        change_percent = _coerce_float(payload.get("change_percent")) or 0.0
        change = round((price * change_percent) / 100, 2) if price else 0.0
        results.append(
            {
                "symbol": str(symbol or ""),
                "name": str(symbol or ""),
                "price": round(price, 2),
                "change": change,
                "changePercent": round(change_percent, 2),
            }
        )
    return results


def _normalize_prediction_market(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("slug", "") or item.get("title", "") or ""),
        "question": str(item.get("title", "") or ""),
        "slug": str(item.get("slug", "") or ""),
        "outcomes": [
            {
                "label": str(outcome.get("name", "") or ""),
                "price": int(round(float(outcome.get("pct", 0) or 0))),
            }
            for outcome in list(item.get("outcomes", []) or [])
            if isinstance(outcome, dict)
        ],
        "volume24hr": float(item.get("volume_24h", 0) or 0),
        "volumeTotal": float(item.get("volume", 0) or 0),
        "liquidity": float(item.get("liquidity", 0) or 0),
        "endDate": str(item.get("end_date", "") or ""),
        "oneDayPriceChange": float(item.get("delta_pct", 0) or 0),
        "image": "",
    }


def _normalize_fire_item(item: dict[str, Any]) -> dict[str, Any]:
    frp = _coerce_float(item.get("frp")) or 0.0
    brightness = _coerce_float(item.get("brightness")) or 0.0
    intensity = "low"
    if frp > 100 or brightness > 400:
        intensity = "extreme"
    elif frp > 50 or brightness > 350:
        intensity = "high"
    elif frp > 20 or brightness > 320:
        intensity = "medium"
    acq_date = str(item.get("acq_date", "") or "")
    acq_time = str(item.get("acq_time", "") or "").zfill(4)
    return {
        "lat": _coerce_float(item.get("lat")),
        "lon": _coerce_float(item.get("lng")),
        "brightness": round(brightness, 1),
        "frp": round(frp, 1),
        "confidence": str(item.get("confidence", "") or ""),
        "intensity": intensity,
        "datetime": f"{acq_date}T{acq_time[:2]}:{acq_time[2:4]}:00Z" if acq_date else "",
        "daynight": str(item.get("daynight", "") or ""),
        "possibleExplosion": bool(frp > 80 and brightness > 380),
    }


def _normalize_satellite_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(item.get("name", "") or item.get("satname", "") or ""),
        "type": str(item.get("type", "") or item.get("classification", "") or "satellite"),
        "lat": _coerce_float(item.get("lat")),
        "lon": _coerce_float(item.get("lng")),
        "altitude": _coerce_float(item.get("alt_km")) or _coerce_float(item.get("altitude")) or 0,
        "velocity": _coerce_float(item.get("velocity_kmh")) or _coerce_float(item.get("velocity")) or 0,
    }


def _normalize_quake_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id", "") or ""),
        "magnitude": _coerce_float(item.get("mag")) or 0,
        "location": str(item.get("place", "") or ""),
        "lat": _coerce_float(item.get("lat")),
        "lon": _coerce_float(item.get("lng")),
        "depth": _coerce_float(item.get("depth")) or 0,
        "time": str(item.get("time", "") or ""),
        "type": "earthquake",
    }


def _normalize_outage_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id", "") or item.get("region", "") or ""),
        "title": str(item.get("title", "") or item.get("region", "") or "Outage"),
        "lat": _coerce_float(item.get("lat")),
        "lon": _coerce_float(item.get("lng")),
        "severity": str(item.get("severity", "") or item.get("status", "") or ""),
        "source": str(item.get("source", "") or "IODA/RIPE"),
        "updated": str(item.get("updated", "") or ""),
    }


def _normalize_sigint_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id", "") or item.get("name", "") or ""),
        "type": str(item.get("type", "") or "signal"),
        "name": str(item.get("name", "") or item.get("label", "") or ""),
        "lat": _coerce_float(item.get("lat")),
        "lon": _coerce_float(item.get("lng")),
        "metadata": item,
    }


def _filter_news(items: list[dict[str, Any]], workspace: str) -> list[dict[str, Any]]:
    if workspace == "global":
        return items[:100]

    filtered = []
    for item in items:
        if matches_workspace_bounds(item, workspace):
            filtered.append(item)
            continue
        text = " ".join(
            [
                str(item.get("title", "") or ""),
                str(item.get("source", "") or ""),
                json.dumps(item.get("articles", []), ensure_ascii=False),
            ]
        )
        if matches_workspace_text(text, workspace):
            filtered.append(item)
    return filtered[:100]


def _filter_geodata(items: list[dict[str, Any]], workspace: str) -> list[dict[str, Any]]:
    if workspace == "global":
        return items
    return [item for item in items if matches_workspace_bounds(item, workspace)]


def _filter_text_items(items: list[dict[str, Any]], workspace: str) -> list[dict[str, Any]]:
    if workspace == "global":
        return items
    filtered = []
    for item in items:
        text = json.dumps(item, ensure_ascii=False)
        if matches_workspace_text(text, workspace):
            filtered.append(item)
    return filtered


def _read_snapshot() -> dict[str, Any]:
    snapshot = get_latest_data()
    if not isinstance(snapshot, dict):
        return {}
    return snapshot


def _feed_payload(feed: str, workspace: str) -> dict[str, Any]:
    snapshot = _read_snapshot()

    if feed == "news":
        return _filter_news(list(snapshot.get("news", []) or []), workspace)

    if feed == "flights":
        flights = list(snapshot.get("military_flights", []) or []) + list(snapshot.get("tracked_flights", []) or [])
        normalized = [_normalize_flight_item(item) for item in _filter_geodata(flights, workspace)]
        normalized = [item for item in normalized if item.get("lat") is not None and item.get("lon") is not None]
        return {
            "total": len(normalized),
            "military": len(normalized),
            "flights": normalized[:200],
            "source": "shadowbroker-intel",
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    if feed == "ships":
        ships = [_normalize_ship_item(item) for item in _filter_geodata(list(snapshot.get("ships", []) or []), workspace)]
        ships = [item for item in ships if item.get("lat") is not None and item.get("lon") is not None]
        return {
            "regions": [WORKSPACES[workspace]["label"]],
            "totalTracked": len(ships),
            "ships": ships[:200],
            "source": "shadowbroker-intel",
            "updated": str(snapshot.get("last_updated", "") or ""),
            "note": "Normalized from vendored Shadowbroker ship feeds",
        }

    if feed == "markets":
        stocks = snapshot.get("stocks", {})
        return _normalize_stock_map(stocks if isinstance(stocks, dict) else {})

    if feed == "polymarket":
        markets = [_normalize_prediction_market(item) for item in _filter_text_items(list(snapshot.get("prediction_markets", []) or []), workspace)]
        return {
            "markets": markets[:50],
            "count": len(markets[:50]),
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    if feed == "fires":
        events = [_normalize_fire_item(item) for item in _filter_geodata(list(snapshot.get("firms_fires", []) or []), workspace)]
        events = [item for item in events if item.get("lat") is not None and item.get("lon") is not None]
        return {
            "total": len(events),
            "highIntensity": len([item for item in events if item.get("intensity") in {"high", "extreme"}]),
            "possibleExplosions": len([item for item in events if item.get("possibleExplosion")]),
            "events": events[:200],
            "source": "NASA FIRMS via Shadowbroker",
            "theater": WORKSPACES[workspace]["label"],
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    if feed == "satellites":
        satellites = [_normalize_satellite_item(item) for item in _filter_geodata(list(snapshot.get("satellites", []) or []), workspace)]
        return {
            "items": satellites[:200],
            "count": len(satellites[:200]),
            "source": str(snapshot.get("satellite_source", "") or ""),
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    if feed == "earthquakes":
        earthquakes = [_normalize_quake_item(item) for item in _filter_geodata(list(snapshot.get("earthquakes", []) or []), workspace)]
        return {
            "items": earthquakes[:200],
            "count": len(earthquakes[:200]),
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    if feed == "internet-outages":
        outages = [_normalize_outage_item(item) for item in _filter_geodata(list(snapshot.get("internet_outages", []) or []), workspace)]
        return {
            "items": outages[:200],
            "count": len(outages[:200]),
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    if feed == "sigint":
        signals = [_normalize_sigint_item(item) for item in _filter_geodata(list(snapshot.get("sigint", []) or []), workspace)]
        return {
            "items": signals[:200],
            "count": len(signals[:200]),
            "totals": snapshot.get("sigint_totals", {}),
            "updated": str(snapshot.get("last_updated", "") or ""),
        }

    raise HTTPException(status_code=404, detail="unsupported_feed")


@app.get("/health")
async def health():
    snapshot = _read_snapshot()
    return {
        "ok": True,
        "status": "ok",
        "lastUpdated": snapshot.get("last_updated"),
        "sources": get_source_timestamps_snapshot(),
    }


@app.get("/internal/feed/{feed}")
async def internal_feed(
    feed: str,
    workspace: str = Query("global"),
    _actor: dict[str, Any] = Depends(require_internal_actor),
):
    normalized_feed = str(feed or "").strip().lower()
    if normalized_feed not in SUPPORTED_FEEDS:
        raise HTTPException(status_code=404, detail="unsupported_feed")
    normalized_workspace = parse_workspace(workspace)
    if normalized_workspace == "network":
        raise HTTPException(status_code=400, detail="network_workspace_has_no_public_feeds")
    return _feed_payload(normalized_feed, normalized_workspace)


@app.get("/internal/map")
async def internal_map(
    workspace: str = Query("global"),
    _actor: dict[str, Any] = Depends(require_internal_actor),
):
    normalized_workspace = parse_workspace(workspace)
    if normalized_workspace == "network":
        raise HTTPException(status_code=400, detail="network_workspace_has_no_map")

    return {
        "workspace": normalized_workspace,
        "updated": _read_snapshot().get("last_updated"),
        "entities": {
            "flights": _feed_payload("flights", normalized_workspace)["flights"],
            "ships": _feed_payload("ships", normalized_workspace)["ships"],
            "fires": _feed_payload("fires", normalized_workspace)["events"],
            "satellites": _feed_payload("satellites", normalized_workspace)["items"],
            "earthquakes": _feed_payload("earthquakes", normalized_workspace)["items"],
            "internetOutages": _feed_payload("internet-outages", normalized_workspace)["items"],
            "sigint": _feed_payload("sigint", normalized_workspace)["items"],
        },
    }


@app.get("/internal/network/status")
async def network_status(actor: dict[str, Any] = Depends(require_internal_actor)):
    _ensure_role(actor, "member", "admin")
    contacts = list_wormhole_dm_contacts()
    return {
        "ok": True,
        "wormhole": get_wormhole_state(),
        "settings": read_wormhole_settings(),
        "router": mesh_router.get_status(),
        "metrics": mesh_metrics_snapshot(),
        "contactsCount": len(contacts),
        "messagesInMemory": int(getattr(dm_relay, "_stats", {}).get("messages_in_memory", 0)),
    }


@app.get("/internal/network/messages")
async def network_messages(
    agentId: str = Query(""),
    claims: str = Query(""),
    agentToken: str = Query(""),
    actor: dict[str, Any] = Depends(require_internal_actor),
):
    _ensure_role(actor, "member", "admin")
    claim_list: list[dict[str, Any]] = []
    if claims:
        try:
            parsed = json.loads(claims)
            if isinstance(parsed, list):
                claim_list = [item for item in parsed if isinstance(item, dict)]
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="invalid_claims") from exc

    if claim_list:
        messages = dm_relay.collect_claims(str(agentId or ""), claim_list)
    else:
        messages = dm_relay.collect_legacy(agent_id=str(agentId or ""), agent_token=str(agentToken or ""))

    return {
        "ok": True,
        "messages": messages,
        "count": len(messages),
    }


@app.post("/internal/network/messages")
async def network_message_send(
    request: Request,
    actor: dict[str, Any] = Depends(require_internal_actor),
):
    _ensure_role(actor, "member", "admin")
    body = await request.json()
    result = dm_relay.store_message(
        sender_id=str(body.get("senderId", "") or ""),
        raw_sender_id=str(body.get("rawSenderId", "") or ""),
        recipient_id=str(body.get("recipientId", "") or ""),
        ciphertext=str(body.get("ciphertext", "") or ""),
        msg_id=str(body.get("msgId", "") or ""),
        delivery_class=str(body.get("deliveryClass", "") or "request"),
        recipient_token=str(body.get("recipientToken", "") or "") or None,
        sender_seal=str(body.get("senderSeal", "") or ""),
        relay_salt=str(body.get("relaySalt", "") or ""),
        sender_token_hash=str(body.get("senderTokenHash", "") or ""),
        payload_format=str(body.get("payloadFormat", "") or "dm1"),
        session_welcome=str(body.get("sessionWelcome", "") or ""),
    )
    return result


@app.get("/internal/network/contacts")
async def network_contacts(actor: dict[str, Any] = Depends(require_internal_actor)):
    _ensure_role(actor, "member", "admin")
    return {
        "ok": True,
        "contacts": list_wormhole_dm_contacts(),
    }


@app.put("/internal/network/contacts/{peer_id}")
async def network_contact_upsert(
    peer_id: str,
    request: Request,
    actor: dict[str, Any] = Depends(require_internal_actor),
):
    _ensure_role(actor, "member", "admin")
    body = await request.json()
    contact = upsert_wormhole_dm_contact(peer_id, body if isinstance(body, dict) else {})
    return {
        "ok": True,
        "peer_id": peer_id,
        "contact": contact,
    }


@app.delete("/internal/network/contacts/{peer_id}")
async def network_contact_delete(peer_id: str, actor: dict[str, Any] = Depends(require_internal_actor)):
    _ensure_role(actor, "member", "admin")
    deleted = delete_wormhole_dm_contact(peer_id)
    return {
        "ok": True,
        "peer_id": peer_id,
        "deleted": deleted,
    }


@app.get("/internal/network/settings")
async def network_settings(actor: dict[str, Any] = Depends(require_internal_actor)):
    _ensure_role(actor, "member", "admin")
    return {
        "ok": True,
        "settings": read_wormhole_settings(),
    }


@app.put("/internal/network/settings")
async def network_settings_update(
    request: Request,
    actor: dict[str, Any] = Depends(require_internal_actor),
):
    _ensure_role(actor, "admin")
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="invalid_settings_payload")
    settings = write_wormhole_settings(
        enabled=body.get("enabled"),
        transport=body.get("transport"),
        socks_proxy=body.get("socks_proxy"),
        socks_dns=body.get("socks_dns"),
        privacy_profile=body.get("privacy_profile"),
        anonymous_mode=body.get("anonymous_mode"),
    )
    return {
        "ok": True,
        "settings": settings,
    }


@app.post("/internal/network/control/{action}")
async def network_control(action: str, actor: dict[str, Any] = Depends(require_internal_actor)):
    _ensure_role(actor, "admin")
    normalized = str(action or "").strip().lower()
    if normalized == "connect":
        return connect_wormhole(reason="bigboss_control_connect")
    if normalized == "disconnect":
        return disconnect_wormhole(reason="bigboss_control_disconnect")
    if normalized == "restart":
        return restart_wormhole(reason="bigboss_control_restart")
    raise HTTPException(status_code=404, detail="unsupported_network_action")
