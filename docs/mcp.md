# BIG BOSS MCP

BIG BOSS ships with a local stdio MCP server so Codex, Claude Desktop, and other MCP clients can pull live read-only intel from the app on demand.

## 1. Create an agent token

1. Sign in to BIG BOSS.
2. Open `Account -> Settings`.
3. In `Agent access tokens`, create a new token.
4. Copy the plaintext token immediately. It is only shown once.

Tokens are read-only and only work against the intel feeds. They do not grant admin or account mutation access.

## 2. Start BIG BOSS

```bash
npm run dev
```

The local app usually runs at `http://127.0.0.1:3000`.
If you changed `APP_PORT` in Docker Compose, use that host port instead.

## 3. Start the MCP server

The stdio server is:

```bash
npm run mcp
```

If you are running the app in Docker Compose, you can also launch the MCP sidecar from the same image:

```bash
docker compose run --rm mcp
```

It expects these environment variables:

```bash
BIG_BOSS_BASE_URL=http://127.0.0.1:3000
BIG_BOSS_API_TOKEN=bb_read_intel_...
```

## Tools

- `get_snapshot(theater, include?)`
  Use for broad situational questions like “What’s happening in Ukraine?”
- `search_intel(query, theater, feeds?, limit?)`
  Use for mention searches and recent matching items.
- `get_feed(feed, theater, limit?)`
  Use for a precise dataset pull from one feed.

Supported feed names:

```text
news, alerts, conflicts, strikes, telegram, regional-alerts,
flights, ships, markets, crypto, oil, polymarket, fires
```

The valid theaters are `middle-east` and `ukraine`.

## Claude Desktop

Add a server entry to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "big-boss": {
      "command": "npm",
      "args": ["--prefix", "/absolute/path/to/bigboss", "run", "mcp"],
      "env": {
        "BIG_BOSS_BASE_URL": "http://127.0.0.1:3000",
        "BIG_BOSS_API_TOKEN": "bb_read_intel_replace_me"
      }
    }
  }
}
```

Restart Claude Desktop after saving the config.

## Codex

Add an MCP server block to your Codex `~/.codex/config.toml`:

```toml
[mcp_servers.big-boss]
command = "npm"
args = ["--prefix", "/absolute/path/to/bigboss", "run", "mcp"]

[mcp_servers.big-boss.env]
BIG_BOSS_BASE_URL = "http://127.0.0.1:3000"
BIG_BOSS_API_TOKEN = "bb_read_intel_replace_me"
```

Restart Codex after saving the config.

## Skill

A repo-shipped Codex skill lives at `skills/big-boss-mcp/SKILL.md`.

To install it into your user skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R /absolute/path/to/bigboss/skills/big-boss-mcp ~/.codex/skills/
```

Once installed, Codex can use the skill to decide when to call `get_snapshot`, `search_intel`, and `get_feed`.

## Notes

- The MCP server is a thin adapter over BIG BOSS HTTP APIs. The web app must already be running.
- If a token is revoked in BIG BOSS, MCP calls immediately stop working.
- Read-only feed routes accept either a browser session or a bearer token. Account, preference, and admin routes still require a normal session.
