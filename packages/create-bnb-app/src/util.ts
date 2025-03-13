import chalk from "chalk";

// Function to check if the string is a valid GitHub URL
export const isGitHubUrl = (url: string): boolean => {
  return url.startsWith("https://github.com/");
};

export const getRepoName = (name: string): string => {
  return name.split("/").pop()?.replace(".git", "") || "hello-world";
};

// Function to show post-clone instructions
export const showPostCloneInstructions = (example: string) => {
  console.log(chalk.cyan("\nPost-clone instructions:"));
  console.log(chalk.yellow(`\n1. Navigate to the app directory:`));
  console.log(chalk.cyan(`   cd ./${example}`));
  console.log(
    chalk.yellow(
      `\n2. Read the app's README.md for further instructions and start developing!`
    )
  );
  console.log(chalk.magenta(`\nGood luck and happy coding! 🚀`));
};
