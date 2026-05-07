# Plugin Deep Scanning Tools

This directory contains tools for analyzing Winamp visualization plugin DLLs at a low level.

## Components

### dll_analyzer.py
Main Python script that analyzes PE (Portable Executable) files.

**Features:**
- Parses PE header structure
- Extracts machine type (x86/x64)
- Identifies if file is a DLL
- Lists all sections
- Detects common Winamp visualization exports
- Extracts version information

**Usage:**
```bash
python3 dll_analyzer.py <path_to_dll>
```

**Output:** JSON with detailed PE information

### run_deep_scan.sh
Bash wrapper script that coordinates the deep scan process.

**Features:**
- Runs the Python analyzer
- Adds additional metadata
- Returns analysis in structured JSON format
- Includes resolution classification system

**Usage:**
```bash
bash run_deep_scan.sh <dll_path> <output_json_path>
```

## Output Format

The deep scan produces JSON with the following structure:

```json
{
  "base_analysis": {
    "file_path": "...",
    "exists": true,
    "size_bytes": 123456,
    "pe_signature": "PE32",
    "machine_type": "i386",
    "bitness": "32-bit",
    "characteristics": ["DLL", "EXECUTABLE_IMAGE"],
    "is_dll": true,
    "sections": [...],
    "exports": [...],
    "version_info": {}
  },
  "scan_timestamp": "2026-05-07T10:30:00Z",
  "scan_method": "deep_scan_v1",
  "estimated_compatibility": "unknown",
  "resolution_classes": [...]
}
```

## Resolution Classification

Plugins are classified by their expected resolution support:

- **Class A**: Full resolution support (640-7680px)
- **Class B**: Standard resolutions (320-3840px)
- **Class C**: Limited resolution (160-1920px)
- **Class D**: Low resolution only (160-800px)
- **Class E**: Unknown capabilities

## Common Winamp Visualization Exports

The scanner looks for these function exports:

- `winampVisGetHeader` - Main entry point
- `winampVisGetHeader2` - Extended header
- `winampVisGetHeader3` - Latest version
- `winampVisInit` - Initialization
- `winampVisRender` - Rendering function
- `winampVisQuit` - Cleanup
- `winampVisConfig` - Configuration dialog

## Database Integration

Results are stored in SQLite with the `plugin_deep_scans` table containing:

- PE file signature and machine type
- Bitness (32/64-bit)
- Detected exports
- Version information
- Estimated resolution class
- Video/audio parameter estimates
- Scan timestamp and method
