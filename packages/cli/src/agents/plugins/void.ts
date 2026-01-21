/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Void agent plugin (open-source AI editor, NOT in CAM - dojo exclusive).
 * Skills are stored in .void/skills/{skill}.md
 */
export const voidPlugin = createAgentPlugin({
  name: 'void',
  displayName: 'Void',
  format: 'flat-md',
  agentDir: '.void/skills',
  cli: 'void'
});
