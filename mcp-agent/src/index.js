import { parseArgs } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  strict: true,
  options: {
    count: { type: "string" },
    geo: { type: "string" },
    industry: { type: "string" },
    tag: { type: "string" },
    taxonomy: { type: "string" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false }
  }
});

const command = positionals[0] || "tools";

if (values.help) {
  console.log("Usage: npm start -- [tools|jobs|taxonomies] [--count 10] [--geo canada] [--industry engineering] [--tag python] [--taxonomy locations] [--json]");
  process.exit(0);
}

if (!["tools", "jobs", "taxonomies"].includes(command)) {
  console.error(`Unknown command: ${command}. Use tools, jobs, or taxonomies.`);
  process.exit(1);
}

let endpoint;

try {
  endpoint = new URL(process.env.JOBICY_MCP_URL || "https://jobicy.com/mcp");
} catch {
  console.error("JOBICY_MCP_URL must be a valid URL.");
  process.exit(1);
}

if (endpoint.protocol !== "https:" || endpoint.hostname !== "jobicy.com") {
  console.error("JOBICY_MCP_URL must be an HTTPS endpoint hosted by jobicy.com.");
  process.exit(1);
}

const timeoutSeconds = Math.max(5, Number.parseInt(process.env.MCP_TIMEOUT_SECONDS || "20", 10) || 20);
const transport = new StreamableHTTPClientTransport(endpoint, {
  fetch: async (url, init = {}) => {
    const timeoutSignal = AbortSignal.timeout(timeoutSeconds * 1000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    const headers = new Headers(init.headers || {});
    headers.set("User-Agent", "Jobicy-Integration-Example/mcp-agent");
    return fetch(url, { ...init, headers, signal });
  }
});
const client = new Client({ name: "jobicy-mcp-agent-example", version: "1.0.0" });

function printResult(result) {
  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.structuredContent) {
    console.log(JSON.stringify(result.structuredContent, null, 2));
    return;
  }

  const text = Array.isArray(result.content)
    ? result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n")
    : "";

  console.log(text || JSON.stringify(result, null, 2));
}

function taxonomyArguments(tool) {
  const requested = values.taxonomy;
  const schema = tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : {};
  const properties = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
  const required = Array.isArray(schema.required) ? schema.required : [];

  if (!requested && !required.length) return {};

  const field = ["type", "taxonomy", "get", "kind"].find((key) => key in properties) || required[0];

  if (!field) return {};

  const configured = properties[field];
  const options = configured && Array.isArray(configured.enum) ? configured.enum.map(String) : [];
  const selected = requested || options.find((option) => /location/i.test(option)) || "locations";

  if (options.length && !options.includes(selected)) {
    throw new Error(`Invalid taxonomy value ${selected}; server accepts: ${options.join(", ")}`);
  }

  return { [field]: selected };
}

try {
  await client.connect(transport);
  const discovery = await client.listTools();
  const available = Array.isArray(discovery.tools) ? discovery.tools : [];

  if (command === "tools") {
    if (values.json) {
      console.log(JSON.stringify(available, null, 2));
    } else if (!available.length) {
      console.log("The Jobicy MCP server did not advertise any tools.");
    } else {
      for (const tool of available) {
        console.log(`${tool.name}${tool.description ? ` — ${tool.description}` : ""}`);
      }
    }
  } else if (command === "jobs") {
    const tool = available.find((candidate) => candidate.name === "get_jobs");
    if (!tool) throw new Error(`Jobicy did not advertise get_jobs. Available tools: ${available.map((item) => item.name).join(", ") || "none"}`);

    const count = Number.parseInt(values.count || process.env.JOBICY_COUNT || "10", 10);
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("count must be between 1 and 100");

    const args = { count };
    const geo = values.geo ?? process.env.JOBICY_GEO;
    const industry = values.industry ?? process.env.JOBICY_INDUSTRY;
    const tag = values.tag ?? process.env.JOBICY_TAG;

    if (geo?.trim()) args.geo = geo.trim();
    if (industry?.trim()) args.industry = industry.trim();
    if (tag?.trim()) args.tag = tag.trim();

    const result = await client.callTool({ name: tool.name, arguments: args });
    if (result.isError) throw new Error(`Jobicy MCP tool returned an error: ${JSON.stringify(result.content)}`);
    printResult(result);
  } else {
    const tool = available.find((candidate) => candidate.name === "get_taxonomies");
    if (!tool) throw new Error(`Jobicy did not advertise get_taxonomies. Available tools: ${available.map((item) => item.name).join(", ") || "none"}`);

    const result = await client.callTool({ name: tool.name, arguments: taxonomyArguments(tool) });
    if (result.isError) throw new Error(`Jobicy MCP tool returned an error: ${JSON.stringify(result.content)}`);
    printResult(result);
  }
} catch (error) {
  console.error(`Jobicy MCP request failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}
