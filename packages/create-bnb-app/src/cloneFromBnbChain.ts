import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

// Default repo to look for local examples
const DEFAULT_GITHUB_API_URL = `https://api.github.com/repos/bnb-chain/example-hub/contents`;

const getRealPath = (p: string) => {
  return p.split("/").slice(1).join("/");
};

export const createFromBnbChainRepo = async (name: string) => {
  // 1. fetch file from github
  console.log(
    `Fetching ${chalk.cyan(name)} template from bnb-chain gitHub repo...`
  );
  const response = await axios
    .get(DEFAULT_GITHUB_API_URL + "/" + name)
    .catch((err) => {
      if (err.response) {
        return err.toJSON();
      }
      return err;
    });

  const files = response.data;
  if (response.status === 404) {
    throw Error(`Cannot found ${name} example in bnb-chain/example-hub`);
  }

  // 2. download and copy
  console.log("Copying files...");
  for (const file of files) {
    if (file.type === "file") {
      const filePath = getRealPath(file.path);
      const folder = path.join(process.cwd(), path.dirname(filePath));
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      const fileResponse = await axios.get(file.download_url, {
        responseType: "stream",
      });
      fileResponse.data.pipe(fs.createWriteStream(filePath));
    } else {
      await createFromBnbChainRepo(file.path);
    }
  }
};
