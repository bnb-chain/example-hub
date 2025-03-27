# Example Creator CLI

The `new-example` CLI is a tool designed to streamline the process of adding new examples to
the [BNB Chain Example Hub](https://github.com/bnb-chain/example-hub). It prompts users for project details, creates the
necessary directory structure, updates the `web/list.json` file, and modifies the root `README.md` with a new table
entry—all with a confirmation step to ensure accuracy.

## Usage

Run the CLI from the root of the `example-hub` repository using the provided npm script:

```bash
npm run generate:new-example
```

This command initiates an interactive process to create a new example project with all necessary updates, guided by user
input and confirmation.
