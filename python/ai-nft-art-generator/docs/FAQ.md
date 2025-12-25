# Frequently Asked Questions (FAQ)

## General Questions

### What is AI NFT Art Generator?
AI NFT Art Generator is a tool that combines Stable Diffusion AI with blockchain technology to create and mint unique NFT collections on BNB Chain.

### Do I need powerful hardware to run this?
While a GPU (CUDA-compatible) will significantly speed up image generation, the tool can run on CPU-only systems. Generation will just take longer.

### Can I use this for commercial projects?
Yes, the project is under MIT license. However, please review the Stable Diffusion license and terms for commercial usage of generated images.

## Technical Questions

### How do I check if CUDA is working?
```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Current device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
```

### Why are my images taking so long to generate?
- Check if CUDA is enabled
- Reduce image size in config
- Lower the number of inference steps
- Try using the DPM-Solver++ scheduler (default in our implementation)

### How can I customize the prompt generation?
Edit the style lists in `src/generators/art_generator.py`:
- `styles`
- `subjects`
- `colors`
- `modifiers`

### What's the maximum collection size?
There's no hard limit, but consider:
- Gas costs for minting
- IPFS storage requirements
- Time needed for generation

## Blockchain Integration

### Which networks are supported?
- BNB Chain Mainnet
- BNB Chain Testnet

### How do I get testnet BNB?
Use the BNB Chain faucet: https://testnet.binance.org/faucet-smart

### Can I use a different network?
The contract is EVM-compatible and can be deployed to any network. Edit the blockchain configuration in `config.yml` to add new networks.

### How are gas fees calculated?
Gas fees are estimated using:
- Current network gas price
- Configurable multiplier (default 1.1x)
- Contract function gas requirements

## NFT Standards

### What metadata standard is used?
We follow OpenSea and BNB Chain NFT metadata standards, including:
- Required fields (name, description, image)
- Optional fields (attributes, animation_url)
- Custom attributes for generation parameters

### How are token IDs assigned?
Token IDs are generated deterministically based on:
- Image content hash
- Optional salt value
- Sequential minting order

### Can I add custom attributes?
Yes, modify the metadata generation in `src/utils/nft_metadata.py`

## IPFS Integration

### Do I need to run an IPFS node?
No, the tool supports:
1. Local IPFS node (optional, fastest)
2. Pinata API (requires API key)
3. Other IPFS services (configurable)

### How long are files stored on IPFS?
- Local node: As long as you pin them
- Pinata: According to your plan
- Consider using multiple pinning services for redundancy

### Can I use a different storage solution?
Yes, modify the `IPFSManager` class or create a new storage adapter implementing the same interface.

## Performance Optimization

### Memory Usage
- Use attention slicing for large images
- Enable gradient checkpointing if needed
- Clear CUDA cache between generations

### Speed Optimization
- Use DPM-Solver++ scheduler
- Adjust inference steps
- Batch process images
- Enable CUDA optimizations

### Gas Optimization
- Use gas price multiplier
- Batch mint when possible
- Monitor network conditions

## Error Handling

### Common Error Messages

1. "CUDA out of memory"
   - Reduce image size
   - Clear CUDA cache
   - Reduce batch size

2. "Contract creation failed"
   - Check gas price/limit
   - Verify account balance
   - Check network status

3. "IPFS upload failed"
   - Check connection
   - Verify credentials
   - Try alternative gateway

## Getting Help

### Where can I get help?
1. Check this FAQ
2. Search GitHub issues
3. Open a new issue
4. Join our Discord community

### How do I report bugs?
See our [Contributing Guidelines](../CONTRIBUTING.md) for bug report instructions.

### Can I request features?
Yes! Open a GitHub issue with the "enhancement" label.