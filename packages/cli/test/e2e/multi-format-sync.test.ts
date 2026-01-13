import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const CLI_PATH = join(process.cwd(), 'dist/index.js');

describe('E2E: Multi-Format Sync', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), 'dojo-sync-e2e-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });

    // Create all agent directories
    await mkdir(join(tmpRoot, '.claude/skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.agent/workflows'), { recursive: true });
    await mkdir(join(tmpRoot, '.cursor/rules'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  async function runDojo(args: string) {
    return execAsync(`node ${CLI_PATH} ${args}`, {
      cwd: tmpRoot,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
  }

  it('should sync skill from Claude to Gemini as 1:1 copy', async () => {
    // 1. Create skill in Claude format
    const skillContent = '# Test Skill\n\nThis is a test skill for sync testing.';
    await writeFile(join(tmpRoot, '.claude/skills/test-skill.md'), skillContent);

    // 2. Run sync
    const { stdout } = await runDojo('sync');
    expect(stdout).toContain('Syncing skills');

    // 3. Verify Gemini copy exists
    const geminiPath = join(tmpRoot, '.agent/workflows/test-skill.md');
    expect(existsSync(geminiPath)).toBe(true);

    // 4. Verify content is 1:1 copy
    const geminiContent = await readFile(geminiPath, 'utf-8');
    expect(geminiContent).toBe(skillContent);
  });

  it('should sync skill from Claude to Cursor with YAML frontmatter', async () => {
    // 1. Create skill in Claude format
    const skillContent = '# Test Skill\n\nThis is a test skill for Cursor format.';
    await writeFile(join(tmpRoot, '.claude/skills/test-skill.md'), skillContent);

    // 2. Run sync
    await runDojo('sync');

    // 3. Verify Cursor format exists
    const cursorPath = join(tmpRoot, '.cursor/rules/test-skill/RULE.md');
    expect(existsSync(cursorPath)).toBe(true);

    // 4. Verify YAML frontmatter
    const cursorContent = await readFile(cursorPath, 'utf-8');
    expect(cursorContent).toContain('---');
    expect(cursorContent).toContain('name: test-skill');
    expect(cursorContent).toContain('alwaysApply: false');
    expect(cursorContent).toContain('description: Test Skill');

    // 5. Verify original content is preserved after frontmatter
    expect(cursorContent).toContain('# Test Skill');
    expect(cursorContent).toContain('This is a test skill for Cursor format.');
  });

  it('should propagate updates on re-sync with --force', async () => {
    // 1. Create initial skill
    const initialContent = '# Initial Skill\n\nInitial content.';
    await writeFile(join(tmpRoot, '.claude/skills/update-test.md'), initialContent);

    // 2. First sync
    await runDojo('sync');

    // 3. Verify initial sync
    const geminiPath = join(tmpRoot, '.agent/workflows/update-test.md');
    const cursorPath = join(tmpRoot, '.cursor/rules/update-test/RULE.md');
    expect(await readFile(geminiPath, 'utf-8')).toBe(initialContent);

    // 4. Modify source
    const updatedContent = '# Updated Skill\n\nUpdated content.';
    await writeFile(join(tmpRoot, '.claude/skills/update-test.md'), updatedContent);

    // 5. Re-sync with force flag
    await runDojo('sync --force');

    // 6. Verify updates propagated
    expect(await readFile(geminiPath, 'utf-8')).toBe(updatedContent);

    const cursorContent = await readFile(cursorPath, 'utf-8');
    expect(cursorContent).toContain('# Updated Skill');
    expect(cursorContent).toContain('Updated content.');
    expect(cursorContent).toContain('description: Updated Skill');
  });

  it('should sync multiple skills correctly', async () => {
    // Create multiple skills
    await writeFile(
      join(tmpRoot, '.claude/skills/skill-one.md'),
      '# Skill One\n\nFirst skill.'
    );
    await writeFile(
      join(tmpRoot, '.claude/skills/skill-two.md'),
      '# Skill Two\n\nSecond skill.'
    );

    // Sync
    const { stdout } = await runDojo('sync');
    expect(stdout).toContain('2 skills');

    // Verify all synced
    expect(existsSync(join(tmpRoot, '.agent/workflows/skill-one.md'))).toBe(true);
    expect(existsSync(join(tmpRoot, '.agent/workflows/skill-two.md'))).toBe(true);
    expect(existsSync(join(tmpRoot, '.cursor/rules/skill-one/RULE.md'))).toBe(true);
    expect(existsSync(join(tmpRoot, '.cursor/rules/skill-two/RULE.md'))).toBe(true);
  });
});
