/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin, AgentPlugin } from '../plugin.js';

/**
 * Cursor agent plugin using folder-rule format with YAML frontmatter.
 * Skills are stored in .cursor/rules/{skill}/RULE.md
 */
export const cursorPlugin: AgentPlugin = createAgentPlugin({
  name: 'cursor',
  displayName: 'Cursor',
  format: 'folder-rule',
  agentDir: '.cursor/rules'
});
