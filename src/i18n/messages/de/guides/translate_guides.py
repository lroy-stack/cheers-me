#!/usr/bin/env python3
"""
Translation script for GrandCafe Cheers training guides from English to German.
Translates G-FS-*.json and G-PRL-*.json files from en/guides/ to de/guides/
"""

import json
import os
import glob
from pathlib import Path

# Define source and target directories
SOURCE_DIR = Path(__file__).parent.parent.parent / "en" / "guides"
TARGET_DIR = Path(__file__).parent

# Files to translate (you can customize this list)
FILES_TO_TRANSLATE = [
    # Food Safety files (G-FS-001 through G-FS-022)
    *[f"G-FS-{i:03d}.json" for i in range(1, 23)],
    # Personnel Labor files (G-PRL-001 through G-PRL-015)
    *[f"G-PRL-{i:03d}.json" for i in range(1, 16)]
]

# German translation mapping for common terms (professional Germany German)
TRANSLATION_MAP = {
    # Headers and common terms
    "title": "Titel wird beibehalten (technischer Begriff)",
    "legalBasis": "Rechtsgrundlage",
    "summary": "Zusammenfassung",
    "keyPoints": "Kernpunkte",
    "sections": "Abschnitte",
    "heading": "Überschrift",
    "content": "Inhalt",
    "subsections": "Unterabschnitte",
    "checklists": "Checklisten",
    "items": "Punkte",
    "bestPractices": "Best Practices",
    "glossary": "Glossar",

    # Technical terms to keep in English/original
    "HACCP": "HACCP",
    "APPCC": "APPCC",
    "CCP": "CCP",
    "EU Regulation": "EU-Verordnung",
    "Royal Decree": "Königliches Dekret",
    "ISO": "ISO",
    "FIFO": "FIFO",
    "COVID-19": "COVID-19",
}

def translate_value(value, context=""):
    """
    Placeholder translation function.
    In practice, you would integrate with a translation API or service.
    This version provides the structure but requires manual translation or API integration.
    """
    # This is a placeholder - actual translation would happen here
    # For now, we'll just mark that translation is needed
    if isinstance(value, str):
        return f"[DE] {value}"  # Placeholder - replace with actual German translation
    return value

def translate_json_structure(obj, parent_key=""):
    """
    Recursively process JSON structure for translation.
    Preserves structure while translating string values.
    """
    if isinstance(obj, dict):
        return {key: translate_json_structure(val, key) for key, val in obj.items()}
    elif isinstance(obj, list):
        return [translate_json_structure(item, parent_key) for item in obj]
    elif isinstance(obj, str):
        # Don't translate certain technical terms or codes
        if parent_key in ["legalBasis"] and any(term in obj for term in ["EU Regulation", "Royal Decree", "No"]):
            # Keep regulation numbers as-is, translate surrounding text
            return obj  # Simplified - would need more sophisticated handling
        return translate_value(obj, parent_key)
    else:
        return obj

def process_file(source_file, target_file):
    """Process a single JSON file from English to German."""
    print(f"Processing: {source_file.name}")

    try:
        # Read source JSON
        with open(source_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Translate the content
        # NOTE: This is where you'd integrate actual translation
        # For now, this creates the structure with placeholders
        translated_data = translate_json_structure(data)

        # Write target JSON
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)

        print(f"  ✓ Created: {target_file.name}")
        return True

    except Exception as e:
        print(f"  ✗ Error processing {source_file.name}: {e}")
        return False

def main():
    """Main translation process."""
    print("=" * 60)
    print("GrandCafe Cheers Training Guides Translation")
    print("English → German (Deutsch)")
    print("=" * 60)
    print()

    # Create target directory if it doesn't exist
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    # Track progress
    total_files = len(FILES_TO_TRANSLATE)
    processed = 0
    successful = 0

    # Process each file
    for filename in FILES_TO_TRANSLATE:
        source_file = SOURCE_DIR / filename
        target_file = TARGET_DIR / filename

        if not source_file.exists():
            print(f"⚠ Skipping {filename}: Source file not found")
            continue

        processed += 1
        if process_file(source_file, target_file):
            successful += 1

    # Summary
    print()
    print("=" * 60)
    print("Translation Summary")
    print("=" * 60)
    print(f"Total files to translate: {total_files}")
    print(f"Files processed: {processed}")
    print(f"Successfully created: {successful}")
    print(f"Errors: {processed - successful}")
    print()
    print("NOTE: This script creates the file structure.")
    print("Actual German translations need to be added manually")
    print("or integrated with a translation service/API.")
    print("=" * 60)

if __name__ == "__main__":
    main()
