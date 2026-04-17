---
name: big-boss-mcp
description: Use when a user asks for live BIG BOSS BOT intelligence, situational awareness, recent conflict updates, specific BIG BOSS BOT feed data, workspace snapshots, map entities, or network status through MCP.
---

# BIG BOSS BOT MCP

Use this skill when the user wants live intel from BIG BOSS BOT rather than static knowledge. Prefer MCP first for live BigBoss questions.

## Tool choice

- Use `list_workspaces` first when you need to confirm what the token can access.
- Use `get_snapshot` for broad questions like “What’s happening globally?” or “Give me a Ukraine overview.”
- Use `search_intel` for mention searches, recent sightings, and “find reports about X” requests.
- Use `get_feed` when the user wants one exact dataset such as `flights`, `news`, `alerts`, `polymarket`, `sigint`, or `satellites`.
- Use `get_map_entities` for geospatial questions that need the live normalized map bundle.
- Use `get_network_status` only for member/admin network checks and only when the token has `read_network` or `use_network`.

## Workspace selection

- Prefer `workspace` over `theater`.
- Use `global` for all public intel requests, including region-specific questions. BigBoss now operates on one global intel workspace.
- `theater` remains a backward-compatibility alias only. `middle-east` and `ukraine` should be treated as old inputs that now resolve to `global`.
- `network` is member-only and should only be used for network status or future network-facing tools, not public intel summaries.

## Response rules

- Treat MCP output as the source of truth.
- Cite the MCP tool names, feed names, workspace ids, timestamps, and source labels you used.
- Preserve timestamps and source labels when they are available.
- Separate public intel results from member-only network results.
- Do not invent feed items or summarize beyond what the MCP output supports.

## Setup

If the MCP server is not available yet, read [references/setup.md](references/setup.md).
