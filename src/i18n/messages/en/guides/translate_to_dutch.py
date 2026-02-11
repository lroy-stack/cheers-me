#!/usr/bin/env python3
"""
Translate training guide JSON files from English to Dutch
"""

import json
import os
from pathlib import Path

# Translation mapping for common terms and phrases
TRANSLATIONS = {
    # Guide metadata
    "title": "titel",
    "legalBasis": "wettelijkeBasis",
    "summary": "samenvatting",
    "keyPoints": "belangrijkstePunten",
    "sections": "secties",
    "heading": "kop",
    "content": "inhoud",
    "subsections": "subsecties",
    "checklists": "checklists",
    "items": "items",
    "bestPractices": "bestePraktijken",
    "glossary": "woordenlijst",
}

def translate_text(text: str, context: str = "") -> str:
    """
    Translate English text to Dutch.
    This is a placeholder - actual translation logic would go here.
    For this version, we'll need to implement the translations manually.
    """
    # This function would contain the actual Dutch translations
    # For now, return the original text as placeholder
    return text


def translate_json_structure(data, parent_key=""):
    """
    Recursively translate JSON structure while maintaining the schema.
    """
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Keep JSON keys in English (schema must stay identical)
            # Translate the values
            result[key] = translate_json_structure(value, key)
        return result
    elif isinstance(data, list):
        return [translate_json_structure(item, parent_key) for item in data]
    elif isinstance(data, str):
        # This is where actual translation would happen
        return translate_text(data, parent_key)
    else:
        return data


def main():
    source_dir = Path(__file__).parent
    output_dir = source_dir.parent.parent / "nl" / "guides"

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Process G-FS and G-PRL files
    file_patterns = [
        f"G-FS-{i:03d}.json" for i in range(1, 23)
    ] + [
        f"G-PRL-{i:03d}.json" for i in range(1, 16)
    ]

    for filename in file_patterns:
        source_file = source_dir / filename
        if not source_file.exists():
            print(f"Skipping {filename} - not found")
            continue

        print(f"Processing {filename}...")

        with open(source_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Translate the structure
        translated_data = translate_json_structure(data)

        # Write to output
        output_file = output_dir / filename
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)

        print(f"Wrote {output_file}")


if __name__ == "__main__":
    main()
