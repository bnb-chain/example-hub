# EduFi-contracts

These contracts manage on-chain courses linked to domain ownership. Only users who own a valid domain from the DNS system can enroll in or access courses. The contracts handle course creation, enrollment, and progress tracking, integrating seamlessly with the DNS and referral systems. Enrollment and Course Progress updates are all done through the relayer created on Openzeppelin's Defender, meaning that zero gas fees are incurred by the end user.

# Live Link
- [learn.level3labs.fun](https://learn.level3labs.fun)

## Getting Started

### Prerequisites

- Node.js and npm
- Hardhat
- A wallet like MetaMask
- Access to the BNB Chain testnet/mainnet

### Installation

```bash
git clone https://github.com/Level3AI-hub/Level3-Contracts.git
cd Level3-Contracts
npm install
```

### Running the Project

1. Compile the contracts:

```bash
npx hardhat compile
```

2. Configure .env variables

```bash
API_KEY=
API_SECRET=
RELAYER_API_KEY=
RELAYER_API_SECRET=
PRIVATE_KEY=
API_URL=
ACTION_ID=
OWNER_ADDRESS=
FORWARDER_ADDRESS=
```

```bash
cp .env.example .env
```

The OWNER_ADDRESS is the wallet that owns the contracts and the API_URL is the RPC_URL.

To get your API_KEY and API_SECRET, Go to [OpenZeppelin Defender](https://defender.openzeppelin.com/v2/#/settings/api-keys/new) and create a new API Key and API Secret.

After doing that, run:

```bash
yarn create-relayer
```

This will create your Relayer API Key and Relayer Secret and will be automatiically stored in your .env file. Your Relayer ID will also be created.

3. Deploy the contracts to a local or test network:

```bash
npx hardhat run scripts/deploy.ts --network <network_name>
```

Then copy Your Forwarder Address and paste in your .env file.

4. Create Action on Defender:

```bash
yarn create-action
```

Then head to [Defender Actions](https://defender.openzeppelin.com/v2/#/actions/automatic) and copy the Actions’s webhook so that you can test functionality and connect the app to the Action for relaying meta-transactions. Keep the Webhook Safe As it will be needed in your frontend.

5. Create A Course:

Fill in your Factory Address and the course you want to create. Then run:

```bash
npx hardhat run scripts/createCourse.ts --network <network_name>
```

## Usage

- Ensure the DNS system is deployed and a user owns a valid domain before testing enrollment.
- Ensure your Relayer is funded with tBNB tokens or BNB tokens
- Deploy course contracts
- Use the exposed functions to create courses, enroll domain holders, and track progress

## Contributing

Contributions are welcome! Please fork the repo and submit a pull request.

## License

MIT License

## Contact

For questions or support, reach out to [info@level3labs.fun](mailto:info@level3labs.fun) or open an issue on GitHub.
