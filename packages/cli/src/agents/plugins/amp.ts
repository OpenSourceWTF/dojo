/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Amp agent plugin (Sourcegraph, CAM-compatible).
 * Skills are stored in .agents/skills/{skill}/SKILL.md
 */
export const ampPlugin = createAgentPlugin({
  name: 'amp',
  displayName: 'Amp',
  format: 'folder-skill',
  agentDir: '.agents/skills',
  cli: 'amp'
});
