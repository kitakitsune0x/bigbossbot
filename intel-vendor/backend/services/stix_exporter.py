"""
stix_exporter.py — Open Intelligence Lab v0.3.0
STIX 2.1 Export Engine

Converts the internal graph representation into fully compliant STIX 2.1 bundles.
Supports export targets: Splunk ES, Microsoft Sentinel, OpenCTI, IBM QRadar SIEM.

Author: Alborz Nazari
License: MIT
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def _stix_id(object_type: str) -> str:
    return f"{object_type}--{uuid.uuid4()}"

def _confidence_to_stix(confidence: float) -> int:
    """Map [0.0, 1.0] float to STIX 2.1 integer confidence [0, 100]."""
    return min(100, max(0, int(round(confidence * 100))))


# ─────────────────────────────────────────────
# Entity → STIX Object Converters
# ─────────────────────────────────────────────

def threat_actor_to_stix(entity: dict) -> dict:
    """Convert a threat_entity of type 'threat_actor' to a STIX 2.1 threat-actor object."""
    return {
        "type": "threat-actor",
        "spec_version": "2.1",
        "id": _stix_id("threat-actor"),
        "created": _now(),
        "modified": _now(),
        "name": entity.get("name", "Unknown"),
        "description": entity.get("description", ""),
        "threat_actor_types": [entity.get("actor_type", "unknown")],
        "aliases": entity.get("aliases", []),
        "sophistication": entity.get("sophistication", "advanced"),
        "resource_level": entity.get("resource_level", "government"),
        "primary_motivation": entity.get("motivation", "unknown"),
        "confidence": _confidence_to_stix(entity.get("confidence", 0.5)),
        "labels": ["threat-actor", entity.get("origin", "unknown").lower()],
        "x_oi_risk_score": entity.get("risk_score", 0.0),
        "x_oi_entity_id": entity.get("id", ""),
        "x_mitre_techniques": entity.get("mitre_techniques", []),
    }


def malware_to_stix(entity: dict) -> dict:
    """Convert a threat_entity of type 'malware' to a STIX 2.1 malware object."""
    return {
        "type": "malware",
        "spec_version": "2.1",
        "id": _stix_id("malware"),
        "created": _now(),
        "modified": _now(),
        "name": entity.get("name", "Unknown"),
        "description": entity.get("description", ""),
        "malware_types": [entity.get("malware_type", "trojan")],
        "is_family": False,
        "capabilities": entity.get("capabilities", []),
        "confidence": _confidence_to_stix(entity.get("confidence", 0.5)),
        "labels": ["malware"],
        "x_oi_risk_score": entity.get("risk_score", 0.0),
        "x_oi_entity_id": entity.get("id", ""),
    }


def infrastructure_to_stix(entity: dict) -> dict:
    """Convert a threat_entity of type 'infrastructure' to a STIX 2.1 infrastructure object."""
    return {
        "type": "infrastructure",
        "spec_version": "2.1",
        "id": _stix_id("infrastructure"),
        "created": _now(),
        "modified": _now(),
        "name": entity.get("name", "Unknown"),
        "description": entity.get("description", ""),
        "infrastructure_types": [entity.get("infra_type", "command-and-control")],
        "confidence": _confidence_to_stix(entity.get("confidence", 0.5)),
        "labels": ["infrastructure"],
        "x_oi_risk_score": entity.get("risk_score", 0.0),
        "x_oi_entity_id": entity.get("id", ""),
    }


def vulnerability_to_stix(entity: dict) -> dict:
    """Convert a CVE entity to a STIX 2.1 vulnerability object."""
    return {
        "type": "vulnerability",
        "spec_version": "2.1",
        "id": _stix_id("vulnerability"),
        "created": _now(),
        "modified": _now(),
        "name": entity.get("cve_id", entity.get("name", "Unknown")),
        "description": entity.get("description", ""),
        "external_references": [
            {
                "source_name": "cve",
                "external_id": entity.get("cve_id", ""),
                "url": f"https://nvd.nist.gov/vuln/detail/{entity.get('cve_id', '')}",
            }
        ],
        "confidence": _confidence_to_stix(entity.get("confidence", 0.5)),
        "labels": ["vulnerability"],
        "x_oi_risk_score": entity.get("risk_score", 0.0),
        "x_oi_entity_id": entity.get("id", ""),
        "x_oi_cvss_score": entity.get("cvss_score", None),
    }


def attack_pattern_to_stix(pattern: dict) -> dict:
    """Convert an attack_pattern entry to a STIX 2.1 attack-pattern object."""
    kill_chain_phases = []
    if pattern.get("kill_chain_phase"):
        kill_chain_phases = [
            {
                "kill_chain_name": "mitre-attack",
                "phase_name": pattern["kill_chain_phase"].lower().replace(" ", "-"),
            }
        ]
    return {
        "type": "attack-pattern",
        "spec_version": "2.1",
        "id": _stix_id("attack-pattern"),
        "created": _now(),
        "modified": _now(),
        "name": pattern.get("name", "Unknown"),
        "description": pattern.get("description", ""),
        "kill_chain_phases": kill_chain_phases,
        "external_references": [
            {
                "source_name": "mitre-attack",
                "external_id": pattern.get("mitre_technique_id", ""),
                "url": f"https://attack.mitre.org/techniques/{pattern.get('mitre_technique_id', '').replace('.', '/')}",
            }
        ],
        "confidence": _confidence_to_stix(pattern.get("confidence", 0.8)),
        "labels": ["attack-pattern"],
        "x_oi_detection": pattern.get("detection", ""),
        "x_oi_mitigation": pattern.get("mitigation", ""),
        "x_oi_pattern_id": pattern.get("id", ""),
    }


def relation_to_stix_relationship(
    relation: dict,
    source_stix_id: str,
    target_stix_id: str,
) -> dict:
    """Convert a relation edge to a STIX 2.1 relationship object."""
    return {
        "type": "relationship",
        "spec_version": "2.1",
        "id": _stix_id("relationship"),
        "created": _now(),
        "modified": _now(),
        "relationship_type": relation.get("relation_type", "related-to").lower().replace("_", "-"),
        "source_ref": source_stix_id,
        "target_ref": target_stix_id,
        "confidence": _confidence_to_stix(relation.get("confidence", 0.5)),
        "description": relation.get("description", ""),
        "labels": [relation.get("relation_type", "related-to")],
    }


def campaign_to_stix(campaign: dict) -> dict:
    """Convert a campaign (Diamond Model) to a STIX 2.1 campaign object."""
    return {
        "type": "campaign",
        "spec_version": "2.1",
        "id": _stix_id("campaign"),
        "created": _now(),
        "modified": _now(),
        "name": campaign.get("name", "Unknown Campaign"),
        "description": campaign.get("description", ""),
        "objective": campaign.get("motivation", ""),
        "first_seen": campaign.get("first_seen", _now()),
        "last_seen": campaign.get("last_seen", _now()),
        "confidence": _confidence_to_stix(campaign.get("confidence", 0.8)),
        "labels": ["campaign"],
        "x_oi_diamond_adversary": campaign.get("adversary", ""),
        "x_oi_diamond_capability": campaign.get("capability", ""),
        "x_oi_diamond_infrastructure": campaign.get("infrastructure", ""),
        "x_oi_diamond_victim": campaign.get("victim", ""),
        "x_oi_campaign_id": campaign.get("id", ""),
    }


# ─────────────────────────────────────────────
# Main Bundle Builder
# ─────────────────────────────────────────────

def build_stix_bundle(
    entities: list[dict],
    attack_patterns: list[dict],
    relations: list[dict],
    campaigns: list[dict],
) -> dict:
    """
    Assemble a complete STIX 2.1 Bundle from Open Intelligence Lab datasets.
    
    Returns a dict ready for json.dumps() — compatible with:
      - Splunk ES (STIX-Taxii connector)
      - Microsoft Sentinel (Threat Intelligence blade)
      - OpenCTI (STIX 2.1 import)
      - IBM QRadar (STIX connector)
    """
    stix_objects = []
    # Track internal ID → STIX ID for relationship resolution
    id_map: dict[str, str] = {}

    # 1. Entities
    type_converters = {
        "threat_actor": threat_actor_to_stix,
        "malware": malware_to_stix,
        "infrastructure": infrastructure_to_stix,
        "vulnerability": vulnerability_to_stix,
        "sector": None,  # STIX 2.1 uses identity for sectors
    }

    for entity in entities:
        etype = entity.get("type", "")
        converter = type_converters.get(etype)
        if converter:
            stix_obj = converter(entity)
            stix_objects.append(stix_obj)
            id_map[entity["id"]] = stix_obj["id"]
        elif etype == "sector":
            # Represent sectors as STIX identity objects
            identity = {
                "type": "identity",
                "spec_version": "2.1",
                "id": _stix_id("identity"),
                "created": _now(),
                "modified": _now(),
                "name": entity.get("name", "Unknown Sector"),
                "identity_class": "class",
                "sectors": [entity.get("sector_name", entity.get("name", "").lower())],
                "description": entity.get("description", ""),
                "labels": ["sector"],
                "x_oi_entity_id": entity.get("id", ""),
            }
            stix_objects.append(identity)
            id_map[entity["id"]] = identity["id"]

    # 2. Attack patterns
    ap_id_map: dict[str, str] = {}
    for ap in attack_patterns:
        stix_obj = attack_pattern_to_stix(ap)
        stix_objects.append(stix_obj)
        ap_id_map[ap["id"]] = stix_obj["id"]

    # 3. Relationships
    for rel in relations:
        src_id = id_map.get(rel.get("source_id", "")) or ap_id_map.get(rel.get("source_id", ""))
        tgt_id = id_map.get(rel.get("target_id", "")) or ap_id_map.get(rel.get("target_id", ""))
        if src_id and tgt_id:
            rel_obj = relation_to_stix_relationship(rel, src_id, tgt_id)
            stix_objects.append(rel_obj)

    # 4. Campaigns
    for campaign in campaigns:
        stix_obj = campaign_to_stix(campaign)
        stix_objects.append(stix_obj)

    # 5. Bundle wrapper
    bundle = {
        "type": "bundle",
        "id": _stix_id("bundle"),
        "spec_version": "2.1",
        "objects": stix_objects,
    }

    return bundle


# ─────────────────────────────────────────────
# Format-Specific Export Helpers
# ─────────────────────────────────────────────

def export_for_splunk(bundle: dict) -> list[dict]:
    """
    Flatten STIX bundle into Splunk-compatible JSON events.
    Each STIX object becomes a Splunk sourcetype=stix event.
    Compatible with: Splunk ES STIX-TAXII connector (>= ES 7.x).
    """
    events = []
    for obj in bundle.get("objects", []):
        event = {
            "sourcetype": "stix",
            "source": "open-intelligence-lab",
            "host": "oi-lab-v0.3.0",
            "index": "threat_intelligence",
            "event": obj,
        }
        events.append(event)
    return events


def export_for_sentinel(bundle: dict) -> list[dict]:
    """
    Format STIX bundle for Microsoft Sentinel Threat Intelligence blade.
    Sentinel ingests STIX 2.1 indicator objects via the TI API.
    Filters to indicator-type objects; wraps others as custom observations.
    Compatible with: Sentinel Threat Intelligence (TAXII) connector.
    """
    sentinel_objects = []
    indicator_types = {"threat-actor", "malware", "attack-pattern", "vulnerability", "campaign"}
    for obj in bundle.get("objects", []):
        if obj.get("type") in indicator_types:
            # Sentinel expects a flat indicator wrapper
            sentinel_objects.append({
                "type": obj["type"],
                "id": obj["id"],
                "name": obj.get("name", ""),
                "description": obj.get("description", ""),
                "confidence": obj.get("confidence", 50),
                "labels": obj.get("labels", []),
                "created": obj.get("created", _now()),
                "modified": obj.get("modified", _now()),
                "spec_version": "2.1",
                "externalReferences": obj.get("external_references", []),
                "extensions": {
                    "x-open-intelligence-lab": {
                        "risk_score": obj.get("x_oi_risk_score", 0.0),
                        "entity_id": obj.get("x_oi_entity_id", ""),
                        "mitre_techniques": obj.get("x_mitre_techniques", []),
                    }
                },
            })
    return sentinel_objects


def export_for_opencti(bundle: dict) -> dict:
    """
    Return the raw STIX 2.1 bundle — OpenCTI natively ingests STIX 2.1.
    Custom x_ extension fields are preserved as-is (OpenCTI passes them through).
    Compatible with: OpenCTI >= 5.x STIX 2.1 import connector.
    """
    return bundle


def export_for_qradar(bundle: dict) -> list[dict]:
    """
    Format STIX bundle for IBM QRadar SIEM.
    QRadar STIX connector expects a flat list of STIX objects with
    mandatory 'type', 'id', 'created', 'modified' fields.
    Compatible with: IBM QRadar STIX Threat Intelligence App >= 3.x.
    """
    qradar_objects = []
    for obj in bundle.get("objects", []):
        flat = {
            "stix_type": obj.get("type", ""),
            "stix_id": obj.get("id", ""),
            "name": obj.get("name", obj.get("id", "")),
            "description": obj.get("description", ""),
            "confidence": obj.get("confidence", 50),
            "created": obj.get("created", _now()),
            "modified": obj.get("modified", _now()),
            "labels": ",".join(obj.get("labels", [])),
            "oi_risk_score": obj.get("x_oi_risk_score", 0.0),
            "oi_entity_id": obj.get("x_oi_entity_id", ""),
            "source": "open-intelligence-lab-v0.3.0",
        }
        # Flatten external references
        ext_refs = obj.get("external_references", [])
        if ext_refs:
            flat["external_id"] = ext_refs[0].get("external_id", "")
            flat["external_source"] = ext_refs[0].get("source_name", "")
        qradar_objects.append(flat)
    return qradar_objects


# ─────────────────────────────────────────────
# CLI / Demo Entry Point
# ─────────────────────────────────────────────

def load_datasets(base_path: str = "datasets") -> tuple:
    """Load all OI Lab datasets from disk."""
    import os

    def _load(filename):
        path = os.path.join(base_path, filename)
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
        return []

    entities = _load("threat_entities.json")
    attack_patterns = _load("attack_patterns.json")
    relations = _load("relations.json")
    campaigns = _load("campaigns.json")
    return entities, attack_patterns, relations, campaigns


def run_export(output_dir: str = "exports", base_path: str = "datasets"):
    """Run full STIX 2.1 export pipeline and write all platform-specific outputs."""
    import os
    os.makedirs(output_dir, exist_ok=True)

    entities, attack_patterns, relations, campaigns = load_datasets(base_path)
    bundle = build_stix_bundle(entities, attack_patterns, relations, campaigns)

    # Raw STIX 2.1 bundle
    with open(f"{output_dir}/stix_bundle.json", "w") as f:
        json.dump(bundle, f, indent=2)
    print(f"[✓] STIX 2.1 bundle written → {output_dir}/stix_bundle.json")

    # Splunk
    with open(f"{output_dir}/splunk_events.json", "w") as f:
        json.dump(export_for_splunk(bundle), f, indent=2)
    print(f"[✓] Splunk events written    → {output_dir}/splunk_events.json")

    # Sentinel
    with open(f"{output_dir}/sentinel_indicators.json", "w") as f:
        json.dump(export_for_sentinel(bundle), f, indent=2)
    print(f"[✓] Sentinel indicators      → {output_dir}/sentinel_indicators.json")

    # OpenCTI (same as raw bundle)
    with open(f"{output_dir}/opencti_bundle.json", "w") as f:
        json.dump(export_for_opencti(bundle), f, indent=2)
    print(f"[✓] OpenCTI bundle written   → {output_dir}/opencti_bundle.json")

    # QRadar
    with open(f"{output_dir}/qradar_objects.json", "w") as f:
        json.dump(export_for_qradar(bundle), f, indent=2)
    print(f"[✓] QRadar objects written   → {output_dir}/qradar_objects.json")

    summary = {
        "version": "v0.3.0",
        "exported_at": _now(),
        "bundle_id": bundle["id"],
        "total_stix_objects": len(bundle["objects"]),
        "export_targets": ["splunk", "sentinel", "opencti", "qradar"],
    }
    with open(f"{output_dir}/export_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print(f"[✓] Export summary           → {output_dir}/export_summary.json")
    return bundle


if __name__ == "__main__":
    run_export()
