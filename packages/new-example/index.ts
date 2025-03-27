import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

// Define the metadata structure based on example-hub's web/list.json
interface ProjectMetadata {
  caseTitle: string;
  caseDesc: string;
  tags: string[];
  github: string;
  replit: string;
  video: { type: string; link: string } | {};
  guide: string;
  otherLink: string;
  imgUrl: string;
}

// Setup readline for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function promptUser(existingTitles: Set<string>): Promise<{
  metadata: ProjectMetadata;
  language: string;
  projectDirName: string
}> {
  console.log('Please provide project basic information for BNB Chain Example Hub:');

  let caseTitle: string;
  do {
    caseTitle = (await askQuestion('Project Name (caseTitle, required): ')).trim();
    if (!caseTitle) {
      console.log('Error: Project Name (caseTitle) is required. Please enter a valid name.');
    } else if (existingTitles.has(caseTitle.toLowerCase())) {
      console.log(`Error: Project '${caseTitle}' already exists in web/list.json. Please choose a different name.`);
    }
  } while (!caseTitle || existingTitles.has(caseTitle.toLowerCase()));

  const caseDesc = (await askQuestion('Project Description (caseDesc, optional): ')).trim() || '';

  const tagsInput = (await askQuestion('Tags (comma-separated, e.g., BSC,opBNB,AI, leave empty for none): ')).trim();
  const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];

  let language: string;
  do {
    language = (await askQuestion('Programming Language (e.g., go/rust/python/typescript or any other, required): ')).trim().toLowerCase();
    if (!language) {
      console.log('Error: Programming Language is required. Please enter a valid language.');
    }
  } while (!language);

  let projectDirName: string;
  do {
    projectDirName = (await askQuestion('Project Directory Name (required, e.g., my-project): ')).trim().toLowerCase();
    if (!projectDirName) {
      console.log('Error: Project Directory Name is required. Please enter a valid directory name.');
    }
  } while (!projectDirName);

  const github = (await askQuestion('GitHub Link (leave empty for auto-generated): ')).trim();
  const replit = (await askQuestion('Replit Link (optional): ')).trim();
  const videoLink = (await askQuestion('Video Link (YouTube, optional): ')).trim();
  const imgUrl = (await askQuestion('Image URL (optional): ')).trim();

  const finalGithub = github || `https://github.com/bnb-chain/example-hub/tree/main/${language}/${projectDirName}`;
  const video = videoLink ? { type: 'youtube', link: videoLink } : {};
  const finalImgUrl = imgUrl || 'https://cms-static.bnbchain.org/dcms/static/303d0c6a-af8f-4098-a2d0-a5b96ef964ba.png';

  const metadata: ProjectMetadata = {
    caseTitle,
    caseDesc,
    tags,
    github: finalGithub,
    replit,
    video,
    guide: '',
    otherLink: 'https://www.bnbchain.org/en/solutions',
    imgUrl: finalImgUrl,
  };

  return { metadata, language, projectDirName };
}

function createLanguageDir(language: string): void {
  const languageDir = path.join(language);
  if (!fs.existsSync(languageDir)) {
    fs.mkdirSync(languageDir, { recursive: true });
    const languageReadmeContent = `# ${language.charAt(0).toUpperCase() + language.slice(1)} Examples

This directory contains all ${language.charAt(0).toUpperCase() + language.slice(1)}-based examples

## Structure

- Each example is organized into its own folder.
`;
    fs.writeFileSync(path.join(languageDir, 'README.md'), languageReadmeContent);
    console.log(`Created new language directory: ${language} with README.md`);
  }
}

function createProjectFolder(language: string, projectDirName: string, metadata: ProjectMetadata): string {
  const projectDir = path.join(language, projectDirName);
  fs.mkdirSync(projectDir, { recursive: true });

  const readmeContent = `# ${metadata.caseTitle}

${metadata.caseDesc}

## Getting Started

### Prerequisites

### Installation

### Running the Project

## Usage

## Contributing

## License

## Contact
`;

  fs.writeFileSync(path.join(projectDir, 'README.md'), readmeContent);
  return projectDir;
}

function updateListJson(metadata: ProjectMetadata, originalContent: string): void {
  const listJsonPath = path.join('web', 'list.json');
  const data: ProjectMetadata[] = JSON.parse(originalContent);
  data.push(metadata);
  fs.writeFileSync(listJsonPath, JSON.stringify(data, null, 2) + '\n');
}

function updateReadme(metadata: ProjectMetadata, language: string, projectDirName: string, originalContent: string): void {
  const readmePath = 'README.md';
  const tableStart = originalContent.indexOf('| Name ');
  const tableEnd = originalContent.indexOf('More examples are coming soon', tableStart);

  const tableContent = originalContent.substring(tableStart, tableEnd).trim();
  const tableLines = tableContent.split('\n');

  const projectPath = `[${language}/${projectDirName}]` +
    `(./${language}/${projectDirName})`;
  const newRow = `| ${projectPath} | ${language.charAt(0).toUpperCase() + language.slice(1)} | ${metadata.caseDesc} | ${metadata.tags.join(', ')} |`;

  tableLines.push(newRow);

  const newContent = originalContent.substring(0, tableStart) + tableLines.join('\n') + '\n' + originalContent.substring(tableEnd);
  fs.writeFileSync(readmePath, newContent);
}

async function confirmChanges(metadata: ProjectMetadata, language: string, projectDirName: string): Promise<boolean> {
  const projectDir = path.join(language, projectDirName);
  console.log('\nSummary of changes:');
  if (!fs.existsSync(language)) {
    console.log(`- Will create new language directory: ${language}`);
  }
  console.log(`- Will create project folder: ${projectDir}`);
  console.log(`- Will update web/list.json with: ${JSON.stringify(metadata, null, 2)}`);
  console.log(`- Will add entry to README.md: ${metadata.caseTitle} (${language})`);

  const confirmation = (await askQuestion('Do you want to proceed with these changes? (yes/no): ')).trim().toLowerCase();
  return confirmation === 'yes' || confirmation === 'y';
}

async function main(): Promise<void> {
  console.log('BNB Chain Example Hub Creator CLI');
  console.log('=================================');

  const listJsonPath = path.join('web', 'list.json');
  const readmePath = 'README.md';
  if (!fs.existsSync(listJsonPath) || !fs.existsSync(readmePath)) {
    console.error('Error: web/list.json or README.md does not exist. Please ensure you\'re in the example-hub root directory.');
    rl.close();
    process.exit(1);
  }

  const originalListJson = fs.readFileSync(listJsonPath, 'utf-8');
  const originalReadme = fs.readFileSync(readmePath, 'utf-8');
  const existingData: ProjectMetadata[] = JSON.parse(originalListJson);
  const existingTitles = new Set(existingData.map(item => item.caseTitle.toLowerCase()));

  const { metadata, language, projectDirName } = await promptUser(existingTitles);

  const confirmed = await confirmChanges(metadata, language, projectDirName);
  if (confirmed) {
    createLanguageDir(language);
    const projectDir = createProjectFolder(language, projectDirName, metadata);
    updateListJson(metadata, originalListJson);
    updateReadme(metadata, language, projectDirName, originalReadme);

    console.log('\nProject creation completed!');
    if (!fs.existsSync(language)) {
      console.log(`Created new language directory: ${language} with README.md`);
    }
    console.log(`Created project folder: ${projectDir} with README.md`);
    console.log('Updated web/list.json');
    console.log('Updated README.md');
    console.log('Next steps:');
    console.log('1. Add implementation code in the project folder.');
    console.log('2. Commit your changes and submit a Pull Request to https://github.com/bnb-chain/example-hub');
  } else {
    console.log('\nProject creation aborted. No changes were made.');
  }

  rl.close();
}

main().catch(err => {
  console.error('An error occurred:', err);
  rl.close();
  process.exit(1);
});
