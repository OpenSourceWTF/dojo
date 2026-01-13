#!/usr/bin/env node
/**
 * @license MIT
 * Copyright (c) 2026 OpenSourceWTF
 * See LICENSE file for details.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { learn } from './commands/learn.js';
import { search } from './commands/search.js';
import { list } from './commands/list.js';
import { sync } from './commands/sync.js';
import { unlearn } from './commands/unlearn.js';

const program = new Command();

program
  .name('dojo')
  .description('Dojo Skill Manager - Install and manage AI agent skills')
  .version('0.1.0');

program.command('learn')
  .description('Install a skill')
  .argument('<skill>', 'Skill name or FQN (e.g., @org/skill)')
  .option('--registry <url>', 'Registry URL (local path or github:owner/repo)')
  .action((skill, opts) => learn(skill, { registry: opts.registry }));

program.command('search')
  .description('Search for skills in the registry')
  .argument('<term>', 'Search term')
  .option('--registry <url>', 'Registry URL (local path or github:owner/repo)')
  .action((term, opts) => search(term, { registry: opts.registry }));

program.command('list')
  .description('List installed skills')
  .action(list);

program.command('sync')
  .description('Sync skills across agent formats')
  .option('-f, --force', 'Overwrite existing skills')
  .action(sync);

program.command('unlearn')
  .description('Remove a skill')
  .argument('<skill>', 'Skill name to remove')
  .option('-y, --yes', 'Skip confirmation')
  .action(unlearn);

program.parse();
