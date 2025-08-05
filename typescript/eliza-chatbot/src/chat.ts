import { Character, settings } from '@elizaos/core';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You: ',
});

rl.prompt();

async function handleUserInput(input: string, agentId: string) {
  if (input.toLowerCase() === 'exit') {
    rl.close();
    process.exit(0);
  }

  try {
    const serverPort = parseInt(settings.SERVER_PORT || '3000');

    const response = await fetch(`http://localhost:${serverPort}/${agentId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input,
        userId: 'user',
        userName: 'User',
      }),
    });

    const data = await response.json();
    rl.pause();

    // Fixed: Add error handling for response data
    if (Array.isArray(data)) {
      data.forEach((message) => {
        if (message && message.text) {
          console.log(`${'Agent'}: ${message.text}`);
        }
      });
    } else if (data && data.text) {
      console.log(`${'Agent'}: ${data.text}`);
    } else {
      console.log('Agent: No response received');
    }

    rl.resume();
    rl.prompt();
  } catch (error) {
    console.error('Error fetching response:', error);
    rl.prompt(); // Ensure prompt is shown even on error
  }
}

export function startChat(character: Character) {
  const agentId = character.name ?? 'Agent';

  rl.on('line', async (input) => {
    await handleUserInput(input, agentId);
  });

  rl.on('SIGINT', () => {
    rl.close();
    process.exit(0);
  });
}
