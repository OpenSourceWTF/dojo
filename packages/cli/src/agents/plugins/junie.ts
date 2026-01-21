/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * JetBrains Junie agent plugin (NOT in CAM - dojo exclusive).
 * Skills are stored in .junie/skills/{skill}.md
 * Junie is JetBrains' AI coding assistant.
 */
export const juniePlugin = createAgentPlugin({
  name: 'junie',
  displayName: 'JetBrains Junie',
  format: 'flat-md',
  agentDir: '.junie/skills',
  // Junie is integrated into JetBrains IDEs
});
