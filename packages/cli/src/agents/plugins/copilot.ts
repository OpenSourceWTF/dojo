/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * GitHub Copilot agent plugin (CAM-compatible).
 * Skills are stored in .github/copilot-instructions/{skill}.md
 * Uses AGENTS.md or .github/copilot-instructions.md for main rules.
 */
export const copilotPlugin = createAgentPlugin({
  name: 'copilot',
  displayName: 'GitHub Copilot',
  format: 'flat-md',
  agentDir: '.github/copilot-instructions',
  // No specific CLI - Copilot is a VS Code extension
});
