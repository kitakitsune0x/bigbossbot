Install and configure BIG BOSS MCP like this:

1. Start the BIG BOSS app locally.
2. Create an `Agent access token` in `Account -> Security`.
3. Configure your MCP client to run `npm --prefix /absolute/path/to/bigboss run mcp`.
4. Set:
   - `BIG_BOSS_BASE_URL=http://127.0.0.1:3000`
   - `BIG_BOSS_API_TOKEN=<the plaintext token>`

The MCP server exposes:

- `get_snapshot`
- `search_intel`
- `get_feed`

Supported theaters:

- `middle-east`
- `ukraine`

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
