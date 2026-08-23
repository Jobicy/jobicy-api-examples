# Jobicy MCP Agent

Connect an AI application, IDE, assistant, or custom agent to the public Jobicy MCP jobs server at `https://jobicy.com/mcp`.

MCP allows compatible AI applications to discover Jobicy's available tools and use live remote job data as an external source. The Jobicy documentation currently describes `get_jobs` and `get_taxonomies`; this example always performs real tool discovery before attempting either call.

## Connect a compatible MCP client

Add the remote server to a client that supports Streamable HTTP MCP endpoints:

```json
{
  "mcpServers": {
    "jobicy-jobs": {
      "url": "https://jobicy.com/mcp"
    }
  }
}
```

The exact settings location differs between MCP-compatible applications. Use the application's remote HTTP server configuration and keep the server URL unchanged.

## Run the official SDK example

```bash
cd mcp-agent
cp .env.example .env
npm install
npm run tools
npm run jobs -- --count 10 --geo canada --industry engineering --tag python
npm run taxonomies -- --taxonomy locations
```

Node.js 20.12 or newer is required. The example uses the stable official `@modelcontextprotocol/sdk` client and `StreamableHTTPClientTransport`.

```bash
npm start -- tools --json
npm start -- jobs --geo usa --industry marketing --count 5
npm start -- jobs --industry engineering --tag backend --json
npm start -- taxonomies --taxonomy industries --json
```

The client connects to the actual Jobicy endpoint, calls `listTools`, verifies that the requested documented tool was really advertised, inspects taxonomy argument schemas dynamically, then invokes the selected tool. It does not invent unsupported tool names or mock results. Timeouts, connection failures, remote tool errors, invalid counts, and unavailable tools produce explicit errors.

## Example AI prompts

- Find the newest remote Python engineering jobs available in Canada.
- Find remote product management jobs.
- Find remote marketing jobs and summarize the best matches.
- Find recently published remote jobs relevant to a senior backend engineer.

An AI agent can call `get_taxonomies` to discover valid location and industry slugs before calling `get_jobs` with optional `count`, `geo`, `industry`, and `tag` arguments. Display the original Jobicy job URLs and include **[Jobs powered by Jobicy](https://jobicy.com/)** wherever results appear.

For current endpoint details and supported filters, see the [official Jobicy API and MCP documentation](https://jobicy.com/jobs-rss-feed).
