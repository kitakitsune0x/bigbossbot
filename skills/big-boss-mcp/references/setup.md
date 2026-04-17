Install and configure BIG BOSS BOT MCP like this:

1. Start the BIG BOSS BOT app locally or on your VPS.
2. Create an `Agent access token` in `Account -> Settings`.
3. Configure your MCP client to run `npm --prefix /absolute/path/to/bigbossbot run mcp`.
4. Set:
   - `BIG_BOSS_BASE_URL=http://127.0.0.1:3000`
   - `BIG_BOSS_API_TOKEN=<the plaintext token>`

For VPS deployments, set `BIG_BOSS_BASE_URL=https://your-domain.example`.

Token scopes:

- `read_intel`: public intel workspaces and tools only
- `read_network`: adds `get_network_status`
- `use_network`: adds network write-capable access for future tools and also covers `get_network_status`

The MCP server exposes:

- `list_workspaces`
- `get_snapshot`
- `get_feed`
- `search_intel`
- `get_map_entities`
- `get_network_status`

Supported workspaces:

- `global`
- `network` when the token scope and account role allow it

Legacy aliases still accepted:

- `middle-east` -> `global`
- `ukraine` -> `global`

Supported feeds:

- `news`
- `alerts`
- `conflicts`
- `strikes`
- `telegram`
- `regional-alerts`
- `flights`
- `ships`
- `markets`
- `crypto`
- `oil`
- `polymarket`
- `fires`
- `satellites`
- `earthquakes`
- `internet-outages`
- `sigint`
