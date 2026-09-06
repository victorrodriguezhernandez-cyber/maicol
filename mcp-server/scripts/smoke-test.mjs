// Quick manual check that the server speaks MCP correctly and that it can
// actually reach Supabase. Run with: npm run smoke
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, '..', 'src', 'index.js')]
});

const client = new Client({ name: 'smoke-test', version: '0.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map((t) => t.name));

const result = await client.callTool({ name: 'get_recent_zones', arguments: { limit: 3 } });
console.log('CALL RESULT:', JSON.stringify(result, null, 2));

await client.close();
