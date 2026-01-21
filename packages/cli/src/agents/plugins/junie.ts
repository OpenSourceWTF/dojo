/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * JetBrains Junie agent plugin.
 * Guidelines are stored in .junie/guidelines.md (single file)
 * Dojo creates skill files in .junie/skills/ for additional skills
 * 
 * @see https://www.jetbrains.com/help/junie/customize-guidelines.html
 */
export const juniePlugin = createAgentPlugin({
  name: 'junie',
  displayName: 'JetBrains Junie',
  format: 'flat-md',
  agentDir: '.junie/skills',
  // Junie is integrated into JetBrains IDEs
});
