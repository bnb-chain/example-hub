import chalk from "chalk";
import { exec } from "child_process";

// Function to clone the template from GitHub directly
export const cloneFromGitHubUrl = async (repoUrl: string) => {
  console.log(chalk.green(`Cloning template from GitHub URL: ${repoUrl}`));

  const command = `git clone ${repoUrl}`;
  try {
    await executeCommand(command);
    console.log(chalk.green("Template cloned successfully from GitHub!"));
  } catch (error) {
    throw new Error("Failed to clone template from GitHub");
  }
};

// Function to execute shell commands
const executeCommand = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${stderr}`);
      } else {
        resolve();
      }
    });
  });
};
