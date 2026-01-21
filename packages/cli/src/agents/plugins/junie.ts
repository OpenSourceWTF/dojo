/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * JetBrains Junie agent plugin.
 * Guidelines in .junie/guidelines.md
 * MCP configuration is done via UI settings.
 * 
 * @see https://www.jetbrains.com/help/junie/customize-guidelines.html
 * @see https://www.jetbrains.com/help/ai-assistant/mcp.html
 */
export const juniePlugin = createAgentPlugin({
  name: 'junie',
  displayName: 'JetBrains Junie',
  format: 'flat-md',
  agentDir: '.junie/skills',
  // MCP config is UI-based
});
