# Example Hub

A hub of frontend, agent kits, and smart contract examples for BNB Chain developers. Build and innovate with
ready-to-use resources.

## Table of Contents

- [Quick Start](#quick-start)
- [Example List](#example-list)
- [How to Add a New Example](#how-to-add-a-new-example)
    - [Development Setup](#development-setup)
    - [Steps to Add a New Example](#steps-to-add-a-new-example)
    - [Additional Notes](#additional-notes)
- [Feedback](#feedback)

## Quick Start

To quickly set up and run a demo locally or kickstart a new project based on an existing demo, use the following
command:

```sh
npx create-bnb-app@latest --example [example-name]
```

This command downloads and sets up the specified example (replace `[example-name]` with an option from
the [Example List](#example-list)).
After setup, navigate to the project directory and follow the example’s `README.md` instructions to run it.

## Example List

Explore a variety of examples for different implementations below. The table includes each example’s name, programming
language, description, and tags to help you find what you need quickly.

| Name                                                   | Language   | Description                              | Tags           |
|--------------------------------------------------------|------------|------------------------------------------|----------------|
| [python/langchain-chatbot](./python/langchain-chatbot) | Python     | A chatbot example using LangChain        | AI, BSC, opBNB |
| [typescript/eliza-chatbot](./typescript/eliza-chatbot) | TypeScript | A chatbot example using Eliza plugin-bnb | AI, BSC, opBNB |

More examples are coming soon—stay tuned for updates!

## How to Add a New Example

Contributing a new example is a fantastic way to support the BNB Chain developer community. Follow these steps to ensure
your submission is seamless and aligns with the repository’s standards.

### Development Setup

To maintain code consistency, install these VS Code extensions before you begin:

- **Python Development**: We use **Black** for Python code formatting. Install
  the <a href="https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter" target="_blank">Black Formatter</a>..
- **TypeScript Development**: We use **Prettier** for formatting TypeScript code.
  Install <a href="https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode" target="_blank">Prettier</a>.

### Steps to Add a New Example

1. **Fork the Repository**: Fork the repository to your GitHub account.
2. **Create a Feature Branch**: Use a descriptive name (e.g., `feature/new-example`).
3. **Choose the Appropriate Directory & Create your App Folder**:

    * Python: `./python/your-example-name/.`
    * TypeScript: `./typescript/your-example-name/.`
    * Other languages: `./newLanguage/examples/.`

4. **Develop Your Example**: Build your example in the chosen folder, adhering to coding standards (Black for Python,
   Prettier for TypeScript).
5. **Provide Documentation**: Include a `README.md` in your example’s folder with clear setup and usage instructions.
6. **Update `web/list.json`**: Add your example's [metadata](./web/README.md) to
   `web/list.json`. This is the metadata list for each example, used for frontend display. Here’s a sample entry:
    ```json
    {
      "caseTitle": "Example",
      "caseDesc": "A brief description of what this example demonstrates.",
      "tags": ["BSC", "opBNB"],
      "github": "GitHub repository link for this example.",
      "replit": "Replit repository link for this example.",
      "video": {
        "type": "Type of video source (e.g., youtube, file).",
        "link": "URL link to the video."
      },
      "guide": "Additional guide document link.",
      "otherLink": "Link to related resource or external page.",
      "imgUrl": "URL of the thumbnail image."
    }
   ```
7. **Update the Main README**: Add your new example to the [Example List](#example-list).
8. **Submit a Pull Request**: Submit your changes for review once everything is complete.

### Additional Notes

* Ensure your example works fully and is well-documented for ease of use.
* Stick to the coding standards to keep the repository consistent.
* For questions or support, open an issue or reach out to the maintainers.

## Feedback

Have ideas to improve this hub or run into any issues? We’d love to hear from you! Please share your thoughts via [GitHub
Issues](https://github.com/your-repo/issues). Your feedback helps us enhance this resource for all developers.

