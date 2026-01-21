/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Aider agent plugin.
 * Skills stored in .aider/skills/
 * Aider does not natively consume MCP servers (it can be an MCP server).
 * 
 * @see https://aider.chat/
 */
export const aiderPlugin = createAgentPlugin({
  name: 'aider',
  displayName: 'Aider',
  format: 'flat-md',
  agentDir: '.aider/skills',
  cli: 'aider'
});
