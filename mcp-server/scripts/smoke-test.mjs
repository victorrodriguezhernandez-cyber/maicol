// Quick manual check that the server speaks MCP correctly and that it can
// actually reach Supabase and Binance. Run with: npm run smoke
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, '..', 'src', 'index.js')],
    // StdioClientTransport only inherits a safe env allowlist by default —
    // pass the full env through so proxy/Supabase overrides actually reach
    // the spawned server process.
    env: { ...process.env }
});

const client = new Client({ name: 'smoke-test', version: '0.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map((t) => t.name));

for (const call of [
    { name: 'get_recent_zones', arguments: { limit: 3 } },
    { name: 'get_live_price', arguments: { symbol: 'BTCUSDT' } },
    { name: 'get_live_candles', arguments: { symbol: 'BTCUSDT', interval: '15m', limit: 2 } }
]) {
    const result = await client.callTool(call);
    console.log(`\n=== ${call.name} ===`);
    console.log(JSON.stringify(result, null, 2));
}

await client.close();
