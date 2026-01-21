/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Aider agent plugin (NOT in CAM - dojo exclusive).
 * Skills are stored in .aider/skills/{skill}.md
 * Aider uses .aider.conf.yml for configuration.
 */
export const aiderPlugin = createAgentPlugin({
  name: 'aider',
  displayName: 'Aider',
  format: 'flat-md',
  agentDir: '.aider/skills',
  cli: 'aider'
});
