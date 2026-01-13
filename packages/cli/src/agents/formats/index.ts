/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

export { SkillFormatPlugin, SkillFormat, FormatInstallOptions, FormatRemoveOptions } from '../format-plugin.js';
export { flatMdPlugin } from './flat-md.js';
export { folderSkillPlugin } from './folder-skill.js';
export { folderRulePlugin } from './folder-rule.js';

import { SkillFormatPlugin, SkillFormat } from '../format-plugin.js';
import { flatMdPlugin } from './flat-md.js';
import { folderSkillPlugin } from './folder-skill.js';
import { folderRulePlugin } from './folder-rule.js';

/**
 * Registry of built-in format plugins.
 */
export const formatPlugins: Record<string, SkillFormatPlugin> = {
  'flat-md': flatMdPlugin,
  'folder-skill': folderSkillPlugin,
  'folder-rule': folderRulePlugin
};

/**
 * Get format plugin by name.
 */
export function getFormatPlugin(format: SkillFormat): SkillFormatPlugin {
  const plugin = formatPlugins[format];
  if (!plugin) {
    throw new Error(`Unknown format plugin: ${format}`);
  }
  return plugin;
}

/**
 * Register a custom format plugin.
 */
export function registerFormatPlugin(plugin: SkillFormatPlugin): void {
  formatPlugins[plugin.name] = plugin;
}
