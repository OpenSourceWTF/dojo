/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Windsurf agent plugin (Codeium).
 * Workflows are stored in .windsurf/workflows/{workflow}.md
 * Rules can be defined in .windsurfrules at project root
 * MCP config is stored in ~/.codeium/windsurf/mcp_config.json
 * 
 * @see https://docs.windsurf.com/windsurf/cascade/workflows
 * @see https://docs.windsurf.com/windsurf/cascade/mcp#mcp_config-json
 */
export const windsurfPlugin = createAgentPlugin({
  name: 'windsurf',
  displayName: 'Windsurf',
  format: 'flat-md',
  agentDir: '.windsurf/workflows',
  cli: 'windsurf',
  mcpConfig: {
    path: '~/.codeium/windsurf/mcp_config.json',
    format: 'json',
    key: 'mcpServers' // Windsurf uses mcpServers key
  }
});
