from web3 import Web3
from eth_account import Account
from pathlib import Path
import json
import logging
from typing import Optional, List, Dict
import time
from ..utils.config import ensure_output_dir

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NFTMinter:
    def __init__(self, config: dict):
        """Initialize NFT minter with configuration"""
        self.config = config
        self.network = config['blockchain']['network']
        network_config = config['blockchain'][self.network]
        
        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(network_config['rpc_url']))
        self.chain_id = network_config['chain_id']
        
        # Load contract ABI
        contract_path = Path(__file__).parent.parent.parent / 'contracts' / 'AiGeneratedNFT.sol'
        if not contract_path.exists():
            raise FileNotFoundError(f"Contract file not found at {contract_path}")
        
        # We'll compile and load the ABI in deploy_contract method
        self.contract_path = contract_path
        self.contract = None
        self.contract_address = None
        
    def load_contract(self, address: str) -> None:
        """
        Load an existing contract instance
        
        Args:
            address: Deployed contract address
        """
        abi_path = Path(__file__).parent.parent.parent / 'contracts' / 'abi' / 'AiGeneratedNFT.json'
        if not abi_path.exists():
            raise FileNotFoundError(f"Contract ABI not found at {abi_path}")
            
        with open(abi_path, 'r') as f:
            contract_abi = json.load(f)
            
        self.contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(address),
            abi=contract_abi
        )
        self.contract_address = address
        
    def deploy_contract(self, private_key: str) -> str:
        """
        Deploy the NFT contract
        
        Args:
            private_key: Deployer's private key
            
        Returns:
            str: Deployed contract address
        """
        # Compile contract using solc
        try:
            from solcx import compile_source, install_solc
            install_solc('0.8.17')
            
            with open(self.contract_path, 'r') as f:
                contract_source = f.read()
                
            compiled_sol = compile_source(
                contract_source,
                output_values=['abi', 'bin'],
                solc_version='0.8.17'
            )
            
            contract_id, contract_interface = compiled_sol.popitem()
            contract_abi = contract_interface['abi']
            contract_bin = contract_interface['bin']
            
            # Save ABI for future use
            abi_dir = Path(__file__).parent.parent.parent / 'contracts' / 'abi'
            abi_dir.mkdir(exist_ok=True)
            with open(abi_dir / 'AiGeneratedNFT.json', 'w') as f:
                json.dump(contract_abi, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error compiling contract: {str(e)}")
            raise
        
        # Deploy contract
        account = Account.from_key(private_key)
        contract = self.w3.eth.contract(abi=contract_abi, bytecode=contract_bin)
        
        # Prepare deployment transaction
        nonce = self.w3.eth.get_transaction_count(account.address)
        
        # Get gas price with optional multiplier
        gas_price = self.w3.eth.gas_price
        gas_multiplier = self.config['blockchain'].get('gas_price_multiplier', 1.1)
        gas_price = int(gas_price * gas_multiplier)
        
        # Constructor arguments
        collection_config = self.config['collection']
        constructor_args = (
            collection_config['name'],
            collection_config['symbol'],
            '',  # Base URI will be set after IPFS upload
            1000  # Max supply
        )
        
        # Build deployment transaction
        transaction = contract.constructor(*constructor_args).build_transaction({
            'from': account.address,
            'gas': 3000000,  # Adjust as needed
            'gasPrice': gas_price,
            'nonce': nonce,
            'chainId': self.chain_id
        })
        
        # Sign and send transaction
        try:
            signed_txn = self.w3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for deployment
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            contract_address = tx_receipt.contractAddress
            
            # Initialize contract instance
            self.contract = self.w3.eth.contract(
                address=contract_address,
                abi=contract_abi
            )
            self.contract_address = contract_address
            
            logger.info(f"Contract deployed at: {contract_address}")
            return contract_address
            
        except Exception as e:
            logger.error(f"Error deploying contract: {str(e)}")
            raise
    
    def mint_nft(
        self,
        token_uri: str,
        to_address: str,
        private_key: str
    ) -> Dict:
        """
        Mint a new NFT
        
        Args:
            token_uri: IPFS URI for the NFT metadata
            to_address: Address to mint the NFT to
            private_key: Private key for transaction signing
            
        Returns:
            dict: Transaction details
        """
        if not self.contract:
            raise ValueError("Contract not initialized. Deploy or load a contract first.")
            
        account = Account.from_key(private_key)
        nonce = self.w3.eth.get_transaction_count(account.address)
        
        # Get gas price with optional multiplier
        gas_price = self.w3.eth.gas_price
        gas_multiplier = self.config['blockchain'].get('gas_price_multiplier', 1.1)
        gas_price = int(gas_price * gas_multiplier)
        
        # Build mint transaction
        transaction = self.contract.functions.mint(token_uri).build_transaction({
            'from': account.address,
            'gas': 200000,  # Adjust as needed
            'gasPrice': gas_price,
            'nonce': nonce,
            'chainId': self.chain_id,
            'value': self.w3.to_wei(0.1, 'ether')  # Mint price
        })
        
        # Sign and send transaction
        try:
            signed_txn = self.w3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Get token ID from event logs
            mint_event = self.contract.events.Transfer().process_receipt(tx_receipt)[0]
            token_id = mint_event['args']['tokenId']
            
            return {
                'transaction_hash': tx_hash.hex(),
                'token_id': token_id,
                'to_address': to_address,
                'token_uri': token_uri
            }
            
        except Exception as e:
            logger.error(f"Error minting NFT: {str(e)}")
            raise
    
    def mint_batch(
        self,
        token_uris: List[str],
        to_address: str,
        private_key: str
    ) -> List[Dict]:
        """
        Mint multiple NFTs in sequence
        
        Args:
            token_uris: List of IPFS URIs for NFT metadata
            to_address: Address to mint the NFTs to
            private_key: Private key for transaction signing
            
        Returns:
            list: List of transaction details for each mint
        """
        results = []
        for uri in token_uris:
            try:
                result = self.mint_nft(uri, to_address, private_key)
                results.append(result)
                
                # Add delay between transactions
                time.sleep(2)  # Adjust as needed
                
            except Exception as e:
                logger.error(f"Error minting NFT with URI {uri}: {str(e)}")
                continue
                
        return results
    
    def set_base_uri(self, base_uri: str, private_key: str) -> str:
        """
        Set the base URI for the collection
        
        Args:
            base_uri: IPFS base URI for the collection
            private_key: Private key for transaction signing
            
        Returns:
            str: Transaction hash
        """
        if not self.contract:
            raise ValueError("Contract not initialized. Deploy or load a contract first.")
            
        account = Account.from_key(private_key)
        nonce = self.w3.eth.get_transaction_count(account.address)
        
        # Build transaction
        transaction = self.contract.functions.setBaseURI(base_uri).build_transaction({
            'from': account.address,
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': nonce,
            'chainId': self.chain_id
        })
        
        # Sign and send transaction
        try:
            signed_txn = self.w3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            return tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Error setting base URI: {str(e)}")
            raise