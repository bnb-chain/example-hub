# create-bnb-app

## Overview

`create-bnb-app` is a command-line tool that allows developers to quickly create BNB Chain project templates. Users can either specify an example name from the official `bnb-chain/example-hub` repository or provide a GitHub URL to clone a specific template.

## Installation

To use `create-bnb-app`, simply run the following command:

```sh
npx create-bnb-app@latest --example <example-name>
```

or with a GitHub URL:

```sh
npx create-bnb-app@latest --example <github-url>
```

> **Note:** If you don't have `npx` installed, please install Node.js (which includes `npx`) from [nodejs.org](https://nodejs.org/).

## Usage

### 1. Using an Example Name

If you provide an example name, the tool will fetch the corresponding template from the official [`bnb-chain/example-hub`](https://github.com/bnb-chain/example-hub#example-list) repository.

```sh
npx create-bnb-app@latest --example python/langchain-bot
```

This will clone the `python/langchain-bot` example from the `bnb-chain/example-hub` repository.

### 2. Using a GitHub URL

If you provide a GitHub URL, the tool will directly clone the specified public repository as a template.

```sh
npx create-bnb-app@latest --example https://github.com/user/your_repo
```

### 3. Post-Clone Instructions

After cloning, you will see helpful instructions highlighted with `chalk`, guiding you on the next steps:

- Navigate into the cloned directory:
  ```sh
  cd <cloned-folder>
  ```
- Follow the `README.md` instructions for installation and setup.

## Features

- Fetch templates by name from the official `bnb-chain/example-hub` repository.
- Clone any public GitHub repository or specific folders as templates.
- Display post-clone instructions with helpful guidance.
- Optimized cloning to avoid downloading unnecessary files.

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007.
