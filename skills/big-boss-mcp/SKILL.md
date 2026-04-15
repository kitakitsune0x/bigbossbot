---
name: big-boss-mcp
description: Use when a user asks for live BIG BOSS BOT intelligence, situational awareness, recent conflict updates, specific BIG BOSS BOT feed data, or searches across the Ukraine or Middle East theaters through MCP.
---

# BIG BOSS BOT MCP

Use this skill when the user wants live intel from BIG BOSS BOT rather than static knowledge.

## Tool choice

- Use `get_snapshot` for broad questions like “What’s happening in Ukraine?” or “Give me a theater overview.”
- Use `search_intel` for mention searches, recent sightings, and “find reports about X” requests.
- Use `get_feed` when the user wants one exact dataset such as `flights`, `news`, `alerts`, or `polymarket`.

## Theater selection

- Use `ukraine` for Ukraine, Russia, Crimea, Black Sea, Kyiv, Kharkiv, Odesa, Kursk, or Belgorod requests.
- Use `middle-east` for Israel, Iran, Gaza, Lebanon, Syria, Red Sea, Gulf, Yemen, or Hormuz requests.
- If the user is ambiguous, ask for the theater or clearly state the assumption you made.

## Response rules

- Treat MCP output as the source of truth.
- Cite the MCP tool and feed names you used.
- Preserve timestamps and source labels when they are available.
- Do not invent feed items or summarize beyond what the MCP output supports.

## Setup

If the MCP server is not available yet, read [references/setup.md](references/setup.md).
