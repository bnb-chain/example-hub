# Full-stack & AI-Driven dApp Development with ChainIDE

> This tutorial guides you through building a full-stack NFT dApp on BNB Chain using the **ChainIDE Code Sage** feature.

![image](https://github.com/user-attachments/assets/eb4913f0-4d0b-4594-9641-0ab944c6fbd3)


## 🧱 Architecture

- **Smart Contract**: NFT (ERC-721)
- **Back-end**: Metadata Service
- **Front-end**: NFT Minting Page

![image](https://github.com/user-attachments/assets/79195309-1f7b-4922-bb3c-9dd0d6a73182)


## ⚙️ Prerequisites

1. Install [MetaMask Wallet](https://metamask.io/)
2. Claim test BNB tokens from the [BNB Testnet Faucet](https://www.bnbchain.org/en/testnet-faucet)
3. Open [ChainIDE](https://chainide.com/)

## 🚀 Development Guide

🎥 Tutorial Video: [Watch on Youtube](https://www.youtube.com/watch?v=5dt1ypn_lwo)

### 1. Start a New Project

- Click **"Code Smarter"**
- Sign in with GitHub
- Click **"New Project"**
- Select **BNB Chain → Demo_AI-driven Web3 Application Development by ChainIDE**

---

### 🔧 Backend (Metadata Service)

1. In the [Code Sage Module](https://chainide.gitbook.io/chainide-english-1/chainide-modules/2.9.-ai-code-sage-module), input the following prompt:

    ```
    Provide an example of an NFT metadata service using the Express framework. The service should include a feature to query the details of two different planets, with the descriptions presented in a visualized manner, and return the metadata in JSON format.
    ```

2. Create a folder called `backend`, add a file named `server.js`, and paste the generated code.

3. Example metadata:

    ```js
    const planets = [
      {
        id: 1,
        name: 'Earth',
        description: 'The third planet from the Sun and the only known astronomical object known to harbor life.',
        image: 'ipfs://bafkreibd6mnqim73brdrzmk26tdsxr75nx75spwuzjzmazdpc77ckuxxym'
      },
      {
        id: 2,
        name: 'Mars',
        description: 'The fourth planet from the Sun and the second-smallest planet in the Solar System.',
        image: 'ipfs://bafkreieirb4w2naao6wdeauujx4ety5chxx225cg32om3nvxd6qki6xdyu'
      }
    ];
    ```

4. Open sandbox:

    ```bash
    cd backend
    npm init -y
    yarn add express
    node server.js
    ```

5. In [Port Manager](https://chainide.gitbook.io/chainide-english-1/port-forwarding), forward **Port 3000** (Protocol: HTTP). (**Copy the link here**, it will be used as the 'port-forwarded backend URL' for the next step!)

---

### ⚙️ Smart Contract (NFT "ERC-721")

1. In the [Code Sage Module](https://chainide.gitbook.io/chainide-english-1/chainide-modules/2.9.-ai-code-sage-module), input:

    ```
    Provide an NFT contract written in Solidity 0.8.23 that overrides the _baseURI() function, renames the private _baseURI variable to _myBaseURI, and includes a mint() function that requires only the address to be filled in, automatically assigning the tokenId by using _nextTokenId++.
    ```

2. Create a `contracts` folder, add `SimpleNFT.sol`, and paste the generated contract code.

3. Compile and deploy the NFTContract to BNB testnet. Use the `port-forwarded backend URL` + `/planet/` for the `baseUri` parameter, such as:

    ```
    https://sandbox-462b47ed7bda42c1a3e0627df87d0edd-binance-3000.uat-sandbox.chainide.com/planet/
    ```

---

### 🎨 Frontend (Minting Page)

1. In the [Code Sage Module](https://chainide.gitbook.io/chainide-english-1/chainide-modules/2.9.-ai-code-sage-module), input:

    ```
    Provide an App.js file using React and ether.js that first connects to the MetaMask wallet (displays the wallet address upon clicking) and then implements a contract mint function (only the 'address' parameter, which users can fill in).
    ```

2. Open sandbox:

    ```bash
    npx create-react-app frontend -y
    ```

3. Replace `frontend/src/App.js` with the generated code.

4. Define `contractAddress` and `contractABI` inside `App.js`. (In the [Compile](https://chainide.gitbook.io/chainide-english-1/chainide-modules/4.5-compile) and [Deployment and Interaction modules](https://chainide.gitbook.io/chainide-english-1/chainide-modules/4.6-deployment-and-interaction), you can find the ABI and address.)

5. Open sandbox:

    ```bash
    cd frontend
    yarn add ethers@5.7.2
    yarn start
    ```

    Would you like to run the app on another port instead? › Y

6. In [Port Manager](https://chainide.gitbook.io/chainide-english-1/port-forwarding), forward **Port 3001** (Protocol: HTTP).

7. Open the forwarded frontend link and start minting your NFTs!

---

## 📁 Code Repo

Explore the full project and all AI-generated code here!

---

Enjoy building your AI-powered Web3 dApp on ChainIDE for BNB Chain!
