import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

function encodeMessage(message: unknown) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

async function readMessage(
  child: ReturnType<typeof spawn>,
  bufferState: { value: Buffer },
): Promise<unknown> {
  for (;;) {
    const headerEnd = bufferState.value.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headerText = bufferState.value.slice(0, headerEnd).toString('utf8');
      const match = headerText.match(/Content-Length:\s*(\d+)/i);
      assert.ok(match);

      const length = Number.parseInt(match[1]!, 10);
      const start = headerEnd + 4;
      const end = start + length;

      if (bufferState.value.length >= end) {
        const body = bufferState.value.slice(start, end).toString('utf8');
        bufferState.value = bufferState.value.slice(end);
        return JSON.parse(body);
      }
    }

    const chunk = await new Promise<Buffer>((resolve, reject) => {
      child.stdout.once('data', resolve);
      child.once('error', reject);
      child.once('exit', (code) => reject(new Error(`MCP server exited early with code ${code ?? 0}.`)));
    });

    bufferState.value = Buffer.concat([bufferState.value, chunk]);
  }
}

test('mcp server initializes and advertises the expected tools', async (t) => {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const tsxPath = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
  const child = spawn(process.execPath, [tsxPath, 'scripts/mcp-server.ts'], {
    cwd,
    env: {
      ...process.env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    child.kill();
  });

  const bufferState = { value: Buffer.alloc(0) };

  child.stdin.write(encodeMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.0' },
    },
  }));

  const initializeResponse = await readMessage(child, bufferState) as {
    result: {
      capabilities: {
        tools: Record<string, unknown>;
      };
    };
  };
  assert.ok(initializeResponse.result.capabilities.tools);

  child.stdin.write(encodeMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  }));

  const toolsResponse = await readMessage(child, bufferState) as {
    result: {
      tools: Array<{ name: string }>;
    };
  };

  assert.deepEqual(
    toolsResponse.result.tools.map((tool) => tool.name),
    ['list_workspaces', 'get_snapshot', 'get_feed', 'search_intel', 'get_map_entities', 'get_network_status'],
  );
});
