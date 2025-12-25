#!/usr/bin/env python3

import argparse
import sys
import os
import json
import time
import logging
from pathlib import Path
from src.utils.config import load_config
from src.generators.art_generator import ArtGenerator
from src.blockchain.nft_minter import NFTMinter
from src.utils.ipfs import IPFSManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_parser():
    """Set up command line argument parser"""
    parser = argparse.ArgumentParser(description='AI NFT Art Generator CLI')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate NFT artwork')
    generate_parser.add_argument('--count', type=int, default=1, help='Number of NFTs to generate')
    generate_parser.add_argument('--prompt', type=str, help='Custom prompt for generation')
    generate_parser.add_argument('--seed', type=int, help='Random seed for generation')
    
    # Deploy command
    deploy_parser = subparsers.add_parser('deploy', help='Deploy NFT contract')
    deploy_parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet',
                             help='Network to deploy to')
    
    # Mint command
    mint_parser = subparsers.add_parser('mint', help='Mint NFTs')
    mint_parser.add_argument('--collection', type=str, required=True,
                          help='Path to collection directory')
    mint_parser.add_argument('--contract', type=str, required=True,
                          help='Contract address')
    
    # Upload command
    upload_parser = subparsers.add_parser('upload', help='Upload to IPFS')
    upload_parser.add_argument('--collection', type=str, required=True,
                           help='Path to collection directory')
    
    return parser

def main():
    """Main CLI entry point"""
    parser = setup_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        # Load configuration
        config = load_config()
        
        if args.command == 'generate':
            generator = ArtGenerator(config)
            if args.prompt and args.count == 1:
                # Single generation with custom prompt
                output_dir = Path(config['output']['base_path']) / 'single'
                output_dir.mkdir(parents=True, exist_ok=True)
                image, params = generator.generate_image(args.prompt, seed=args.seed)
                timestamp = params.get('timestamp', '')
                image_name = f'generated_{timestamp}.png'
                image.save(output_dir / image_name)
                logger.info(f"Generated image saved to {output_dir / image_name}")
            elif args.prompt and args.count > 1:
                # Batch generation with custom prompt
                generator.generate_batch(args.count, custom_prompt=args.prompt)
            else:
                # Batch generation
                generator.generate_batch(args.count)
                
        elif args.command == 'deploy':
            # Override network in config
            config['blockchain']['network'] = args.network
            
            minter = NFTMinter(config)
            private_key = os.getenv('PRIVATE_KEY')
            if not private_key:
                raise ValueError("PRIVATE_KEY environment variable not set")
                
            contract_address = minter.deploy_contract(private_key)
            logger.info(f"Contract deployed at: {contract_address}")
            
        elif args.command == 'mint':
            minter = NFTMinter(config)
            minter.load_contract(args.contract)
            
            collection_path = Path(args.collection)
            if not collection_path.exists():
                raise FileNotFoundError(f"Collection not found: {args.collection}")
                
            # Upload to IPFS first
            ipfs = IPFSManager(config)
            ipfs.connect()
            
            # Upload each NFT
            nft_files = sorted(collection_path.glob("*.json"))
            token_uris = []
            
            for nft_file in nft_files:
                # Upload image first
                with open(nft_file, 'r') as f:
                    metadata = json.load(f)
                image_path = collection_path / metadata['image']
                
                image_result = ipfs.upload_file(image_path)
                metadata['image'] = image_result['url']
                
                # Upload updated metadata
                metadata_result = ipfs.upload_json(metadata)
                token_uris.append(metadata_result['url'])
                
            # Mint NFTs
            private_key = os.getenv('PRIVATE_KEY')
            if not private_key:
                raise ValueError("PRIVATE_KEY environment variable not set")
                
            results = minter.mint_batch(
                token_uris,
                os.getenv('WALLET_ADDRESS'),
                private_key
            )
            
            logger.info(f"Successfully minted {len(results)} NFTs")
            
        elif args.command == 'upload':
            ipfs = IPFSManager(config)
            ipfs.connect()
            
            collection_path = Path(args.collection)
            if not collection_path.exists():
                raise FileNotFoundError(f"Collection not found: {args.collection}")
                
            # Upload collection
            results = []
            for file_path in collection_path.glob("*"):
                if file_path.is_file():
                    result = ipfs.upload_file(file_path)
                    results.append({
                        'file': file_path.name,
                        'ipfs': result
                    })
                    
            # Save upload results
            with open(collection_path / 'ipfs_uploads.json', 'w') as f:
                json.dump(results, f, indent=2)
                
            logger.info(f"Uploaded {len(results)} files to IPFS")
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()