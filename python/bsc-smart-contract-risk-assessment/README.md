# BSC Smart Contract Risk Agent

This project is an AI-powered agent that analyzes smart contract ABIs for potential risks using:

- **Python** (OpenAI + BscScan API)
- **Node.js + TypeScript** (to interact with the agent)

---

## 📁 Project Structure

```plaintext
evm_agent/
├── agent.py              # Python AI agent
├── testAgent.ts          # TypeScript script to call the agent
├── testAgent.js          # Transpiled JavaScript output
├── .env                  # API keys
├── package.json
├── tsconfig.json
├── venv/                 # Python virtual environment
└── node_modules/         # Node.js dependencies
```

---

## ⚙️ Step 1: Python Setup

Create a virtual environment and install the required libraries:

```bash
cd evm_agent
python -m venv venv
```

Activate the virtual environment:

- On **Windows**:

  ```bash
  venv\Scripts\activate
  ```

- On **macOS/Linux**:

  ```bash
  source venv/bin/activate
  ```

Install Python dependencies:

```bash
pip install openai python-dotenv langdetect requests
```

---

## 🔐 Step 2: Create the `.env` File

Create a `.env` file in the root directory and insert your API keys:

```env
BSCSCAN_API_KEY=your_bscscan_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

## ⚙️ Step 3: TypeScript Setup

Install Node.js dependencies and compile the TypeScript file:

```bash
npm install
npx tsc
```

This will generate `testAgent.js` from `testAgent.ts`.

---

## ▶️ Step 4: Running the Agent

### Option 1: Run the Python script directly

```bash
python agent.py
```

Example input:

```
0x4E83362442f8e5e6cFd4081C2A2dA47F52A49089 đánh giá bằng tiếng việt
```

### Option 2: Run using Node.js

```bash
node testAgent.js
```

---

## 🧠 Features

- Extracts EVM contract address from user message
- Fetches contract ABI from BscScan
- Uses OpenAI (GPT-4 or GPT-3.5) to analyze:
  - Use of `delegatecall`, `selfdestruct`, or `onlyOwner`
  - Suspicious token withdrawals without approval
  - Potential backdoors or unauthorized fund access
- Detects language (English or Vietnamese) and replies accordingly

---

## ⚠️ Windows Unicode Output Fix

### In `agent.py`

Add the following at the top of the file to ensure UTF-8 output in Windows terminals:

```python
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
```

### In `testAgent.ts`

Ensure output is decoded as UTF-8:

```ts
python.stdout.on("data", (data) => {
  console.log("Output:", data.toString("utf8"));
});
```

---

## ✅ Completed

You now have a working AI agent to analyze smart contract risks.
