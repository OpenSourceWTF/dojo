import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Path to the CLI executable
// Assuming we run tests from packages/cli/ or root
const CLI_PATH = join(process.cwd(), 'dist/index.js');

describe('E2E: CLI Install Flow', () => {
  let tmpRoot: string;
  let registryPath: string;
  let fixturesPath: string;

  beforeAll(async () => {
    // Ensure CLI is built
    // await execAsync('pnpm build'); // Assuming it's already built or handled by pipeline
  });

  beforeEach(async () => {
    // 1. Create temp directory
    tmpRoot = join(tmpdir(), 'dojo-e2e-' + Date.now());
    await mkdir(tmpRoot, { recursive: true });

    // 2. Setup directory structure
    registryPath = join(tmpRoot, 'registry');
    fixturesPath = join(tmpRoot, 'fixtures');
    await mkdir(join(registryPath, 'official'), { recursive: true });
    await mkdir(fixturesPath, { recursive: true });
    await mkdir(join(tmpRoot, '.claude/skills'), { recursive: true });
    await mkdir(join(tmpRoot, '.agent/workflows'), { recursive: true });

    // 3. Create mock skill fixture
    const skillContent = '# Test Skill\nThis is a test skill.';
    const skillPath = join(fixturesPath, 'skill.md');
    await writeFile(skillPath, skillContent);

    // 4. Create registry file
    const registryContent = {
      _meta: { source: 'test', updated: '2026-01-01', priority: 100 },
      skills: {
        '@test/create-docx': {
          name: 'Create Word Documents',
          path: 'create-docx',
          source: `file:${skillPath}`,
          aliases: ['word', 'docx', 'document'],
          description: 'Create and edit Microsoft Word documents',
          tags: ['documents', 'office', 'productivity'],
          versions: {
            '1.0.0': 'a1b2c3d4',
            latest: 'a1b2c3d4'
          }
        }
      }
    };
    await writeFile(
      join(registryPath, 'official', 'test.json'),
      JSON.stringify(registryContent, null, 2)
    );
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  async function runDojo(args: string) {
    // Run dojo command in the temp directory
    // We pass registry path via environment variable or just place it in cwd
    // Learn command defaults to cwd/registry if not specified.
    return execAsync(`node ${CLI_PATH} ${args}`, {
      cwd: tmpRoot,
      env: { ...process.env, FORCE_COLOR: '0' } // Disable color for easier parsing
    });
  }

  it('should search for a skill', async () => {
    const { stdout } = await runDojo('search docx');
    expect(stdout).toContain('@test/create-docx');
    // The search output currently shows FQN and Description
    expect(stdout).toContain('Create and edit Microsoft Word documents');
  });

  it('should install a skill to all agents', async () => {
    const { stdout } = await runDojo('learn @test/create-docx');
    
    expect(stdout).toContain('Installing @test/create-docx');
    expect(stdout).toContain('Installed to:');

    // Verify file existence
    const claudePath = join(tmpRoot, '.claude/skills/create-docx.md');
    const geminiPath = join(tmpRoot, '.agent/workflows/create-docx.md');
    
    expect(await readFile(claudePath, 'utf-8')).toContain('# Test Skill');
    expect(await readFile(geminiPath, 'utf-8')).toContain('# Test Skill');
  });

  it('should list installed skills', async () => {
    // Install first
    await runDojo('learn @test/create-docx');

    const { stdout } = await runDojo('list');
    
    expect(stdout).toContain('Claude');
    expect(stdout).toContain('create-docx');
    expect(stdout).toContain('Gemini');
  });

  it('should unlearn a skill', async () => {
    // Install first
    await runDojo('learn @test/create-docx');
    
    // Verify installed
    let claudePath = join(tmpRoot, '.claude/skills/create-docx.md');
    expect(await readFile(claudePath, 'utf-8')).toBeTruthy();

    // Unlearn
    const { stdout } = await runDojo('unlearn create-docx -y'); // -y to skip confirmation if implemented
    // Note: unlearn command implementation needs to be checked if it prompts
    
    // Verify removed
    await expect(readFile(claudePath)).rejects.toThrow();
  });
});
