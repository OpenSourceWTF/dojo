declare module '@opensourcewtf/dojo-cli/lib/install.js' {
  export interface InstallOptions {
    version?: string;
  }

  export interface InstallResult {
    success: boolean;
    message: string;
    fqn?: string;
    installedPaths: string[];
  }

  export function installSkill(
    skillQuery: string,
    options?: InstallOptions
  ): Promise<InstallResult>;
}
