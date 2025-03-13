#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import simpleGit from "simple-git";
import { cloneFromGitHubUrl } from "./cloneFromGitHubUrl";
import { createFromBnbChainRepo } from "./cloneFromBnbChain";
import { isGitHubUrl, getRepoName, showPostCloneInstructions } from "./util";
import * as fs from "fs";

const program = new Command();

// Template command
program
  .name("create-bnb-app")
  .description("CLI to create a BNB Chain example template")
  .option(
    "-e, --example <name|github-url>",
    "An example to bootstrap the app with. You can use an example name from the official bnb-chain/example-hub repo or a GitHub URL.(e.g. python/langchain-chatbot)"
  )
  .action(async (options) => {
    if (!options.example) {
      console.error(chalk.red("Error: Example name or URL is required."));
      process.exit(1);
    }

    const { example } = options;
    const repoName = getRepoName(example);

    if (fs.existsSync(repoName)) {
      console.error(
        chalk.red(`Error: The folder '${chalk.cyan(repoName)}' already exists.`)
      );
      return;
    }

    try {
      // If the example looks like a URL, treat it as a GitHub URL
      if (isGitHubUrl(example)) {
        await cloneFromGitHubUrl(example);
      } else {
        // If it's a name, get template from bnb-chain repo
        await createFromBnbChainRepo(example);
      }

      // init as new git repo
      console.log("Initializing new Git repository...");
      const git = simpleGit(repoName);
      await git.init();
      await git.add(".");
      await git.commit("Initial commit from template");

      // Print post-clone instructions
      showPostCloneInstructions(repoName);
    } catch (error) {
      console.error(chalk.red("Error while creating template:"), error);
    }
  });

program.parse(process.argv);
