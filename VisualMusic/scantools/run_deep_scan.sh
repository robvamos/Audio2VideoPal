#!/bin/bash
# Advanced DLL Scanner for Winamp Visualization Plugins
# This script coordinates deep analysis of visualization DLLs

DLL_PATH="$1"
OUTPUT_JSON="$2"

if [ -z "$DLL_PATH" ] || [ -z "$OUTPUT_JSON" ]; then
    echo '{"error": "Usage: run_deep_scan.sh <dll_path> <output_json>"}'
    exit 1
fi

if [ ! -f "$DLL_PATH" ]; then
    echo "{\"error\": \"File not found: $DLL_PATH\"}"
    exit 1
fi

# Get the directory where this script is located
SCANTOOLS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run Python analyzer
PYTHON_OUTPUT=$(python3 "$SCANTOOLS_DIR/dll_analyzer.py" "$DLL_PATH" 2>&1)

# Add additional metadata
RESULT=$(cat <<EOF
{
  "base_analysis": $PYTHON_OUTPUT,
  "scan_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scan_method": "deep_scan_v1",
  "estimated_compatibility": "unknown",
  "resolution_classes": [
    {
      "class": "A",
      "description": "Full resolution support",
      "min_width": 640,
      "max_width": 7680
    },
    {
      "class": "B", 
      "description": "Standard resolutions",
      "min_width": 320,
      "max_width": 3840
    },
    {
      "class": "C",
      "description": "Limited resolution",
      "min_width": 160,
      "max_width": 1920
    },
    {
      "class": "D",
      "description": "Low resolution only",
      "min_width": 160,
      "max_width": 800
    },
    {
      "class": "E",
      "description": "Unknown",
      "min_width": null,
      "max_width": null
    }
  ]
}
EOF
)

echo "$RESULT" > "$OUTPUT_JSON"
echo "$RESULT"
