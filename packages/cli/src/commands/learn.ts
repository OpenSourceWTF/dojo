import chalk from 'chalk';

export async function learn(skill: string) {
  console.log(chalk.blue(`Learning skill: ${skill}`));
  console.log(chalk.gray('Coming soon...'));
}
