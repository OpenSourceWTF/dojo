/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Kilocode agent plugin (CAM-compatible).
 * Skills are stored in .kilocode/rules/{skill}.md
 */
export const kilocodePlugin = createAgentPlugin({
  name: 'kilocode',
  displayName: 'Kilocode',
  format: 'flat-md',
  agentDir: '.kilocode/rules',
  cli: 'kilocode'
});
