/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin, AgentPlugin } from '../plugin.js';

/**
 * Antigravity agent plugin using flat-md format.
 * Skills are stored in .agent/workflows/{skill}.md
 */
export const antigravityPlugin: AgentPlugin = createAgentPlugin({
  name: 'antigravity',
  displayName: 'Antigravity',
  format: 'flat-md',
  agentDir: '.agent/workflows'
});
