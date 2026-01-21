/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { createAgentPlugin } from '../plugin.js';

/**
 * Windsurf agent plugin (Codeium).
 * Workflows are stored in .windsurf/workflows/{workflow}.md
 * Rules can be defined in .windsurfrules at project root
 * 
 * @see https://docs.windsurf.com/windsurf/cascade/workflows
 */
export const windsurfPlugin = createAgentPlugin({
  name: 'windsurf',
  displayName: 'Windsurf',
  format: 'flat-md',
  agentDir: '.windsurf/workflows',
  cli: 'windsurf'
});
