/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Cody agent plugin (Sourcegraph, NOT in CAM - dojo exclusive).
 * Skills are stored in .cody/skills/{skill}.md
 */
export const codyPlugin = createAgentPlugin({
  name: 'cody',
  displayName: 'Cody',
  format: 'flat-md',
  agentDir: '.cody/skills',
  cli: 'cody'
});
