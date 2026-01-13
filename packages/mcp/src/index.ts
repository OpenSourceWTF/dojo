/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { installSkill } from "@opensourcewtf/dojo-cli/lib/install.js";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

export const TOOLS = [
  {
    name: "dojo_learn",
    description: "Use this when the user asks about learning a skill, knowing something, or phrases like 'do you know X', 'teach me X', 'learn X', 'I need the X skill'. Searches the skill registry and installs matching skills to all detected agent directories.",
    inputSchema: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          description: "The skill name or search term",
        },
        version: {
          type: "string",
          description: "Optional version (semver or commit hash)",
        },
      },
      required: ["skill"],
    },
  },
];

export async function handleDojoLearn(args: any) {
  const { skill, version } = args as {
    skill: string;
    version?: string;
  };

  try {
    const result = await installSkill(skill, { version });

    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${result.message}`,
          },
        ],
        isError: true,
      };
    }

    const skillName = result.fqn || skill;
    let responseText = `I know kung fu! 🥋\n\nInstalled ${skillName} to:\n`;

    for (const p of result.installedPaths) {
      responseText += `• ${p}\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: responseText.trim(),
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

export const server = new Server(
  {
    name: "dojo-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "dojo_learn") {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  return handleDojoLearn(request.params.arguments);
});

const app = new Hono();

// Custom endpoint for verification as requested in T15
app.get("/mcp/tools", (c) => {
  return c.json({ tools: TOOLS });
});

// We can still support stdio if needed, but the verify command uses HTTP.
// For now, let's just use the Hono server for HTTP.

const port = 3000;

// Only start the server if this file is run directly
if (process.argv[1]?.endsWith('index.js') || process.env.NODE_ENV === 'production') {
  console.error(`Dojo MCP server running on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}