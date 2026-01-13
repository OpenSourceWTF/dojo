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
import { installSkill, uninstallSkill } from "@opensourcewtf/dojo/lib/install.js";

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
        projectRoot: {
          type: "string",
          description: "Project root directory where skills will be installed. If not provided, uses current working directory.",
        },
      },
      required: ["skill"],
    },
  },
  {
    name: "dojo_unlearn",
    description: "Use this when the user asks to remove, uninstall, or unlearn a skill. Removes skill files from all detected agent directories.",
    inputSchema: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          description: "The skill name to remove",
        },
        projectRoot: {
          type: "string",
          description: "Project root directory where skills will be removed from. If not provided, uses current working directory.",
        },
      },
      required: ["skill"],
    },
  },
];

export async function handleDojoLearn(args: unknown) {
  const { skill, version, projectRoot } = args as {
    skill: string;
    version?: string;
    projectRoot?: string;
  };

  try {
    const result = await installSkill(skill, { version, projectRoot });

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
    const displayName = skillName.split('/').pop() || skillName;
    let responseText = `I know ${displayName}! 🥋\n\nInstalled to:\n`;

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

export async function handleDojoUnlearn(args: unknown) {
  const { skill, projectRoot } = args as {
    skill: string;
    projectRoot?: string;
  };

  try {
    const result = await uninstallSkill(skill, { projectRoot });

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

    let responseText = `🗑️ Unlearned ${skill}!\n\nRemoved from:\n`;

    for (const p of result.removedPaths) {
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
  switch (request.params.name) {
    case "dojo_learn":
      return handleDojoLearn(request.params.arguments);
    case "dojo_unlearn":
      return handleDojoUnlearn(request.params.arguments);
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

// MCP uses stdio transport - start it when run directly
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dojo MCP server running via stdio");
}

// Only start if this file is run directly
if (process.argv[1]?.endsWith("index.js")) {
  main().catch(console.error);
}