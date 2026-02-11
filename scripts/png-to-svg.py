#!/usr/bin/env python3
"""
PNG to SVG converter for logo branding assets.

Uses Pillow for image processing and potrace for bitmap tracing.

Dependencies:
    pip install Pillow pypotrace

Usage:
    python scripts/png-to-svg.py input.png output.svg
    python scripts/png-to-svg.py input.png output.svg --color "#E67E22"
    python scripts/png-to-svg.py input.png output.svg --threshold 128

If pypotrace is not available, falls back to a simple threshold-based
SVG path generation using Pillow only.
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)


def png_to_svg_potrace(input_path: str, output_path: str, color: str = "#000000", threshold: int = 128) -> None:
    """Convert PNG to SVG using potrace (if available)."""
    try:
        import potrace
    except ImportError:
        print("pypotrace not available, using fallback method...")
        png_to_svg_fallback(input_path, output_path, color, threshold)
        return

    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # Create binary bitmap from alpha channel
    bitmap = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            # Pixel is "on" if it has significant opacity and is dark enough
            is_on = a > threshold and (r + g + b) / 3 < 200
            row.append(1 if is_on else 0)
        bitmap.append(row)

    # Create potrace bitmap
    bm = potrace.Bitmap(bitmap)
    path = bm.trace()

    # Generate SVG
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">',
    ]

    for curve in path:
        svg_parts.append(f'  <path d="')
        parts = []
        start = curve.start_point
        parts.append(f"M{start.x:.1f},{start.y:.1f}")
        for segment in curve:
            if segment.is_corner:
                parts.append(f"L{segment.c.x:.1f},{segment.c.y:.1f}")
                parts.append(f"L{segment.end_point.x:.1f},{segment.end_point.y:.1f}")
            else:
                c1 = segment.c1
                c2 = segment.c2
                end = segment.end_point
                parts.append(f"C{c1.x:.1f},{c1.y:.1f} {c2.x:.1f},{c2.y:.1f} {end.x:.1f},{end.y:.1f}")
        parts.append("Z")
        svg_parts.append(" ".join(parts))
        svg_parts.append(f'" fill="{color}" />')

    svg_parts.append("</svg>")

    Path(output_path).write_text("\n".join(svg_parts))
    print(f"SVG written to {output_path} ({width}x{height})")


def png_to_svg_fallback(input_path: str, output_path: str, color: str = "#000000", threshold: int = 128) -> None:
    """Fallback: convert PNG to SVG using simple rect-based tracing."""
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # Scale down for performance if image is very large
    max_dim = 256
    if width > max_dim or height > max_dim:
        ratio = max_dim / max(width, height)
        new_w = int(width * ratio)
        new_h = int(height * ratio)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        scale_x = width / new_w
        scale_y = height / new_h
        width, height = new_w, new_h
    else:
        scale_x = 1.0
        scale_y = 1.0

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {int(width * scale_x)} {int(height * scale_y)}" '
        f'width="{int(width * scale_x)}" height="{int(height * scale_y)}">',
    ]

    # Run-length encoding per row for efficiency
    for y in range(height):
        x = 0
        while x < width:
            r, g, b, a = img.getpixel((x, y))
            if a > threshold:
                # Start of a run
                run_start = x
                while x < width:
                    r2, g2, b2, a2 = img.getpixel((x, y))
                    if a2 <= threshold:
                        break
                    x += 1
                run_len = x - run_start
                rx = int(run_start * scale_x)
                ry = int(y * scale_y)
                rw = int(run_len * scale_x)
                rh = int(scale_y)
                svg_parts.append(f'  <rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="{color}" />')
            else:
                x += 1

    svg_parts.append("</svg>")

    Path(output_path).write_text("\n".join(svg_parts))
    print(f"SVG (fallback) written to {output_path} ({int(width * scale_x)}x{int(height * scale_y)})")


def main():
    parser = argparse.ArgumentParser(description="Convert PNG logo to SVG")
    parser.add_argument("input", help="Input PNG file path")
    parser.add_argument("output", help="Output SVG file path")
    parser.add_argument("--color", default="#000000", help='Fill color for SVG paths (default: "#000000")')
    parser.add_argument("--threshold", type=int, default=128, help="Alpha threshold for tracing (0-255, default: 128)")

    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    png_to_svg_potrace(args.input, args.output, args.color, args.threshold)


if __name__ == "__main__":
    main()
