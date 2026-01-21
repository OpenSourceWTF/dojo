/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Cline agent plugin.
 * Rules are stored in .clinerules/
 * MCP config is managed via VSCode settings/UI, stored in global storage.
 * 
 * @see https://docs.cline.bot/mcp/configuring-mcp-servers
 */
export const clinePlugin = createAgentPlugin({
  name: 'cline',
  displayName: 'Cline',
  format: 'flat-md',
  agentDir: '.clinerules',
  cli: 'cline',
  // MCP config is in VSCode global storage, not easily accessible via file path standard
});
