from pathlib import Path
import torch
import random
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
from PIL import Image
import json
import time
from ..utils.config import ensure_output_dir, get_metadata_template
from ..utils.nft_metadata import NFTMetadataGenerator

class ArtGenerator:
    def __init__(self, config):
        self.config = config
        self.sd_config = config['stable_diffusion']
        self.output_config = config['output']
        self.metadata_generator = NFTMetadataGenerator(config)
        
        # Initialize Stable Diffusion with optimized settings
        self.pipeline = StableDiffusionPipeline.from_pretrained(
            self.sd_config['model_id'],
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            safety_checker=None  # Disable safety checker for faster generation
        )
        
        # Use DPM-Solver++ scheduler for better quality and speed
        self.pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            self.pipeline.scheduler.config
        )
        
        if torch.cuda.is_available():
            self.pipeline = self.pipeline.to("cuda")
            self.pipeline.enable_attention_slicing()  # Reduce memory usage
    
    def generate_image(self, prompt, seed=None, num_inference_steps=None):
        """Generate a single image using Stable Diffusion"""
        if seed is not None:
            torch.manual_seed(seed)
            random.seed(seed)
            
        # Use provided steps or default from config
        steps = num_inference_steps or self.sd_config['num_inference_steps']
        
        # Combine prompt with prefix and ensure proper formatting
        full_prompt = self._format_prompt(prompt)
        
        # Generate image with error handling
        try:
            image = self.pipeline(
                prompt=full_prompt,
                negative_prompt=self.sd_config['negative_prompt'],
                num_inference_steps=steps,
                guidance_scale=self.sd_config['guidance_scale'],
                height=self.sd_config['image_size'],
                width=self.sd_config['image_size']
            ).images[0]
            
            timestamp = int(time.time())
            return image, {
                'prompt': full_prompt,
                'negative_prompt': self.sd_config['negative_prompt'],
                'seed': seed,
                'steps': steps,
                'guidance_scale': self.sd_config['guidance_scale'],
                'timestamp': timestamp
            }
        except Exception as e:
            print(f"Error generating image: {str(e)}")
            raise
    
    def generate_batch(self, count, custom_prompt=None):
        """Generate a batch of images with metadata"""
        timestamp = int(time.time())
        collection_name = f"collection_{timestamp}"
        output_dir = ensure_output_dir(self.output_config['base_path'], collection_name)
        
        metadata_template = get_metadata_template(self.config)
        generation_params = []
        
        for i in range(count):
            # Use custom prompt if provided, otherwise generate one
            prompt = custom_prompt if custom_prompt else self._generate_prompt()
            seed = int(time.time() * 1000) + i
            
            try:
                # Generate image with metadata
                image, params = self.generate_image(prompt, seed)
                
                # Save image
                image_filename = f"nft_{i}.{self.output_config['image_format']}"
                image_path = output_dir / image_filename
                image.save(image_path, quality=95)  # High quality save
                
                # Generate token ID from image data
                img_byte_arr = image_path.read_bytes()
                token_id = self.metadata_generator.generate_token_id(img_byte_arr)
                
                # Create NFT metadata
                attributes = [
                    {'trait_type': 'Prompt', 'value': params['prompt']},
                    {'trait_type': 'Negative Prompt', 'value': params['negative_prompt']},
                    {'trait_type': 'Seed', 'value': str(params['seed'])},
                    {'trait_type': 'Steps', 'value': params['steps']},
                    {'trait_type': 'Guidance Scale', 'value': params['guidance_scale']},
                    {'trait_type': 'Token ID', 'value': str(token_id)}
                ]
                
                metadata = self.metadata_generator.create_nft_metadata(
                    name=f"{self.config['collection']['name']} #{i+1}",
                    image_uri=image_filename,
                    attributes=attributes
                )
                
                # Validate and save metadata
                self.metadata_generator.validate_metadata(metadata)
                metadata_path = output_dir / f"nft_{i}.json"
                self.metadata_generator.save_metadata(metadata, metadata_path)
                
                generation_params.append(params)
                print(f"Generated image {i+1}/{count}: {image_filename}")
                
            except Exception as e:
                print(f"Error generating image {i+1}: {str(e)}")
                continue
        
        # Create and save collection metadata
        collection_metadata = self.metadata_generator.create_collection_metadata(
            total_supply=len(generation_params),
            image_uri=str(output_dir / "preview.png"),  # We'll need to create this
        )
        collection_metadata['generation_params'] = generation_params
        
        self.metadata_generator.save_metadata(
            collection_metadata,
            output_dir / 'collection_metadata.json'
        )
        
        # Create a preview image from the first generated image if available
        if generation_params:
            first_image_path = output_dir / f"nft_0.{self.output_config['image_format']}"
            if first_image_path.exists():
                preview_path = output_dir / "preview.png"
                Image.open(first_image_path).save(preview_path)
                
        print(f"Generated {len(generation_params)} images in {output_dir}")
        
    def _format_prompt(self, prompt):
        """Format the prompt with prefix and ensure proper structure"""
        prefix = self.sd_config['prompt_prefix'].strip()
        prompt = prompt.strip()
        
        # Combine prefix and prompt if both exist
        if prefix and prompt:
            return f"{prefix}, {prompt}"
        return prefix or prompt
    
    def _generate_prompt(self):
        """Generate a unique prompt for the image"""
        styles = [
            "digital art", "oil painting", "watercolor", "pencil sketch",
            "3D render", "pixel art", "abstract", "surreal", "minimalist"
        ]
        
        subjects = [
            "landscape", "portrait", "still life", "abstract composition",
            "futuristic city", "nature scene", "fantasy creature", "geometric patterns"
        ]
        
        colors = [
            "vibrant", "monochromatic", "pastel", "neon",
            "dark and moody", "bright and cheerful"
        ]
        
        modifiers = [
            "highly detailed", "ethereal", "dramatic lighting",
            "peaceful", "energetic", "mysterious", "dream-like"
        ]
        
        # Randomly combine elements to create a unique prompt
        prompt_elements = [
            random.choice(styles),
            random.choice(subjects),
            random.choice(colors),
            random.choice(modifiers)
        ]
        
        return ", ".join(prompt_elements)