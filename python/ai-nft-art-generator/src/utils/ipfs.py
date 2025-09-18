import ipfshttpclient
import requests
import logging
from pathlib import Path
from typing import Union, Dict, Optional
import json
from .helpers import retry_with_backoff

logger = logging.getLogger(__name__)

class IPFSManager:
    def __init__(self, config: dict):
        """Initialize IPFS manager with configuration"""
        self.config = config
        self.ipfs_config = config['blockchain']['ipfs']
        self.client = None
        
    def connect(self) -> None:
        """Connect to IPFS node"""
        try:
            self.client = ipfshttpclient.connect(self.ipfs_config['api_url'])
            logger.info("Connected to IPFS node")
        except Exception as e:
            logger.warning(f"Could not connect to local IPFS node: {str(e)}")
            logger.info("Will use Pinata API for IPFS uploads")
            
    @retry_with_backoff
    def upload_file(
        self,
        file_path: Union[str, Path],
        use_pinata: bool = True
    ) -> Dict[str, str]:
        """
        Upload file to IPFS
        
        Args:
            file_path: Path to file to upload
            use_pinata: Whether to use Pinata API as fallback
            
        Returns:
            dict: IPFS hash and URL
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
            
        try:
            if self.client:
                # Try local IPFS node first
                result = self.client.add(str(file_path))
                ipfs_hash = result['Hash']
            elif use_pinata:
                # Fall back to Pinata
                ipfs_hash = self._upload_to_pinata(file_path)
            else:
                raise RuntimeError("No IPFS upload method available")
                
            gateway_url = f"{self.ipfs_config['gateway']}{ipfs_hash}"
            
            return {
                'hash': ipfs_hash,
                'url': gateway_url
            }
            
        except Exception as e:
            logger.error(f"Error uploading to IPFS: {str(e)}")
            raise
            
    @retry_with_backoff
    def upload_json(
        self,
        data: dict,
        filename: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Upload JSON data to IPFS
        
        Args:
            data: JSON data to upload
            filename: Optional filename for the JSON
            
        Returns:
            dict: IPFS hash and URL
        """
        if not filename:
            filename = 'metadata.json'
            
        # Create temporary file
        temp_path = Path('/tmp') / filename
        with open(temp_path, 'w') as f:
            json.dump(data, f)
            
        try:
            result = self.upload_file(temp_path)
            return result
        finally:
            temp_path.unlink()  # Clean up temp file
            
    def _upload_to_pinata(self, file_path: Path) -> str:
        """
        Upload file to Pinata
        
        Args:
            file_path: Path to file to upload
            
        Returns:
            str: IPFS hash
        """
        pinata_api_key = self.config.get('pinata_api_key')
        pinata_secret = self.config.get('pinata_secret')
        
        if not (pinata_api_key and pinata_secret):
            raise ValueError("Pinata API credentials not configured")
            
        url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
        
        headers = {
            'pinata_api_key': pinata_api_key,
            'pinata_secret_api_key': pinata_secret
        }
        
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f)}
            response = requests.post(url, files=files, headers=headers)
            
        response.raise_for_status()
        return response.json()['IpfsHash']
        
    def get_gateway_url(self, ipfs_hash: str) -> str:
        """
        Get gateway URL for IPFS hash
        
        Args:
            ipfs_hash: IPFS hash
            
        Returns:
            str: Gateway URL
        """
        return f"{self.ipfs_config['gateway']}{ipfs_hash}"