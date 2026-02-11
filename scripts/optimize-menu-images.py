#!/usr/bin/env python3
"""
Menu Image Optimizer for GrandCafe Cheers Mallorca
Resizes, crops, and converts images to WebP format for optimal performance.

Usage:
    python scripts/optimize-menu-images.py <input_dir> <output_dir>

Requirements:
    pip install Pillow
"""

import sys
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

MAX_WIDTH = 800
MAX_HEIGHT = 600
TARGET_RATIO = 4 / 3
WEBP_QUALITY = 80


def center_crop_to_ratio(img: Image.Image, target_ratio: float) -> Image.Image:
    """Center-crop image to target aspect ratio if needed."""
    w, h = img.size
    current_ratio = w / h

    if abs(current_ratio - target_ratio) < 0.01:
        return img

    if current_ratio > target_ratio:
        # Too wide: crop width
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        # Too tall: crop height
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))


def optimize_image(input_path: Path, output_path: Path) -> bool:
    """Optimize a single image: resize, crop, convert to WebP."""
    try:
        with Image.open(input_path) as img:
            # Convert to RGB if necessary (e.g., RGBA, palette)
            if img.mode in ('RGBA', 'P', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Center crop to 4:3
            img = center_crop_to_ratio(img, TARGET_RATIO)

            # Resize to max dimensions maintaining aspect ratio
            img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)

            # Save as WebP
            output_path.parent.mkdir(parents=True, exist_ok=True)
            webp_path = output_path.with_suffix('.webp')
            img.save(webp_path, 'WebP', quality=WEBP_QUALITY, method=6)

            original_size = input_path.stat().st_size
            optimized_size = webp_path.stat().st_size
            savings = ((original_size - optimized_size) / original_size) * 100

            print(f"  {input_path.name} -> {webp_path.name} "
                  f"({img.size[0]}x{img.size[1]}, "
                  f"{optimized_size / 1024:.0f}KB, "
                  f"{savings:.0f}% smaller)")
            return True

    except Exception as e:
        print(f"  ERROR: {input_path.name}: {e}")
        return False


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <input_dir> <output_dir>")
        sys.exit(1)

    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'}
    images = [
        f for f in input_dir.iterdir()
        if f.is_file() and f.suffix.lower() in image_extensions
    ]

    if not images:
        print(f"No images found in '{input_dir}'")
        sys.exit(0)

    print(f"Optimizing {len(images)} images...")
    print(f"  Settings: max {MAX_WIDTH}x{MAX_HEIGHT}, 4:3 crop, WebP Q{WEBP_QUALITY}")
    print()

    success_count = 0
    for img_path in sorted(images):
        output_path = output_dir / img_path.name
        if optimize_image(img_path, output_path):
            success_count += 1

    print(f"\nDone: {success_count}/{len(images)} images optimized to '{output_dir}'")


if __name__ == '__main__':
    main()
