from __future__ import annotations

import re
from typing import Any

WORKSPACES: dict[str, dict[str, Any]] = {
    "global": {
        "id": "global",
        "label": "Global",
        "kind": "global",
        "public": True,
        "filter_preset": "global",
    },
    "middle-east": {
        "id": "middle-east",
        "label": "Middle East",
        "kind": "theater",
        "public": True,
        "filter_preset": "middle-east",
        "bounds": {
            "min_lat": 10.0,
            "max_lat": 45.0,
            "min_lon": 20.0,
            "max_lon": 70.0,
        },
        "keywords": re.compile(
            r"iran|israel|idf|irgc|hezbollah|hamas|houthi|lebanon|gaza|tehran|tel\s?aviv|jerusalem|yemen|iraq|syria|gulf|hormuz|red\s?sea|missile|strike|interception|nuclear|sanction|centcom|pentagon|middle\s?east|west\s?bank|golan|sinai|negev|dimona|natanz|isfahan|khamenei|netanyahu|nasrallah|proxy|ceasefire|escalat|retaliat|iron\s?dome|arrow|patriot|drone|uav|saudi|emirates|uae|bahrain|qatar|kuwait|oman|gcc|persian\s?gulf",
            re.IGNORECASE,
        ),
    },
    "ukraine": {
        "id": "ukraine",
        "label": "Ukraine",
        "kind": "theater",
        "public": True,
        "filter_preset": "ukraine",
        "bounds": {
            "min_lat": 43.0,
            "max_lat": 57.0,
            "min_lon": 20.0,
            "max_lon": 42.0,
        },
        "keywords": re.compile(
            r"ukraine|russia|russian|kyiv|kiev|kharkiv|odesa|odessa|dnipro|zaporizhzhia|sumy|chernihiv|mykolaiv|kherson|crimea|sevastopol|donetsk|luhansk|belgorod|kursk|kremlin|zelensky|putin|black\s?sea|frontline|air\s?raid|artillery|cluster|glide\s?bomb|drone|shahed|iskander|kalibr|storm shadow|atacms|patriot|s-300|mobiliz|offensive|missile|strike|intercept",
            re.IGNORECASE,
        ),
    },
    "network": {
        "id": "network",
        "label": "Network",
        "kind": "network",
        "public": False,
        "filter_preset": "network",
    },
}


def parse_workspace(value: str | None) -> str:
    candidate = str(value or "").strip().lower()
    if candidate in WORKSPACES:
        return candidate
    return "global"


def workspace_definition(workspace_id: str) -> dict[str, Any]:
    return WORKSPACES[parse_workspace(workspace_id)]


def item_coordinates(item: dict[str, Any]) -> tuple[float | None, float | None]:
    lat = item.get("lat")
    if lat is None:
        lat = item.get("latitude")
    if lat is None:
        coords = item.get("coords")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            lat = coords[0]

    lon = item.get("lon")
    if lon is None:
        lon = item.get("lng")
    if lon is None:
        lon = item.get("longitude")
    if lon is None:
        coords = item.get("coords")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            lon = coords[1]

    try:
        lat_value = float(lat) if lat is not None else None
    except (TypeError, ValueError):
        lat_value = None

    try:
        lon_value = float(lon) if lon is not None else None
    except (TypeError, ValueError):
        lon_value = None

    return lat_value, lon_value


def matches_workspace_bounds(item: dict[str, Any], workspace_id: str) -> bool:
    definition = workspace_definition(workspace_id)
    bounds = definition.get("bounds")
    if not bounds:
        return True

    lat, lon = item_coordinates(item)
    if lat is None or lon is None:
        return False

    return (
        bounds["min_lat"] <= lat <= bounds["max_lat"]
        and bounds["min_lon"] <= lon <= bounds["max_lon"]
    )


def matches_workspace_text(text: str, workspace_id: str) -> bool:
    definition = workspace_definition(workspace_id)
    matcher = definition.get("keywords")
    if matcher is None:
        return True
    return bool(matcher.search(str(text or "")))
