"""PLAN/CCG Vessel Alert DB — load and enrich AIS vessels with Chinese navy/coast guard metadata."""
import os
import json
import logging

logger = logging.getLogger("services.data_fetcher")

_PLAN_CCG_DB: dict = {}


def _load_plan_ccg_db():
    """Load plan_ccg_vessels.json into memory at import time."""
    global _PLAN_CCG_DB
    json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "plan_ccg_vessels.json"
    )
    if not os.path.exists(json_path):
        logger.warning(f"PLAN/CCG vessel DB not found at {json_path}")
        return
    try:
        with open(json_path, "r", encoding="utf-8") as fh:
            _PLAN_CCG_DB.update(json.load(fh))
        logger.info(f"PLAN/CCG vessel DB loaded: {len(_PLAN_CCG_DB)} vessels")
    except (IOError, OSError, json.JSONDecodeError, ValueError, KeyError) as e:
        logger.error(f"Failed to load PLAN/CCG vessel DB: {e}")


_load_plan_ccg_db()


def enrich_with_plan_vessel(ship: dict) -> dict:
    """If ship's MMSI is in the PLAN/CCG DB, attach enrichment metadata."""
    mmsi = str(ship.get("mmsi", "")).strip()
    if mmsi and mmsi in _PLAN_CCG_DB:
        info = _PLAN_CCG_DB[mmsi]
        ship["plan_name"] = info.get("name", "")
        ship["plan_class"] = info.get("class", "")
        ship["plan_force"] = info.get("force", "")
        ship["plan_hull"] = info.get("hull_number", "")
        ship["plan_wiki"] = info.get("wiki", "")
    return ship
