# Windows Scanning Tools

Advanced scanning tools specifically designed for Windows to perform in-depth analysis of Winamp visualization plugins.

## Scripts

### 1. analyze_pe.ps1 (PowerShell)
**Purpose**: Deep PE (Portable Executable) header analysis

**Features**:
- Parses DOS and PE headers
- Extracts COFF header information
- Lists all sections with memory details
- Detects Winamp visualization exports
- Identifies machine type and bitness
- Determines DLL characteristics

**Usage**:
```powershell
powershell.exe -ExecutionPolicy Bypass -File analyze_pe.ps1 -DllPath "C:\path\to\plugin.dll" -OutputJson "output.json"
```

**Output**: Detailed JSON with PE structure, sections, and detected exports

---

### 2. extract_metadata.vbs (VBScript)
**Purpose**: Extract detailed file and version metadata

**Features**:
- Reads version information using WMIC
- Extracts file timestamps (created, modified, accessed)
- Retrieves product version
- Gets company and file descriptions
- Uses Windows API for accurate metadata

**Usage**:
```cmd
cscript.exe extract_metadata.vbs "C:\path\to\plugin.dll" "output.json"
```

**Output**: JSON with version info, timestamps, and product details

---

### 3. gather_wmi_info.vbs (VBScript)
**Purpose**: Gather Windows system and hardware information for compatibility analysis

**Features**:
- Collects OS information (version, build, type)
- Detects GPU/Video adapters
- Gets system hardware details
- Lists audio devices
- Analyzes compatibility requirements

**Usage**:
```cmd
cscript.exe gather_wmi_info.vbs "C:\path\to\plugin.dll" "output.json"
```

**Output**: JSON with system capabilities, GPU info, audio devices

---

### 4. check_security.vbs (VBScript)
**Purpose**: Analyze security attributes and digital signatures

**Features**:
- Checks for digital signatures
- Verifies certificate validity
- Analyzes file attributes (read-only, system, hidden, archive)
- Scans for suspicious patterns
- Flags unusual file locations or sizes

**Usage**:
```cmd
cscript.exe check_security.vbs "C:\path\to\plugin.dll" "output.json"
```

**Output**: JSON with signature status, security attributes, threat assessment

---

### 5. run_deep_scan_windows.bat (Batch)
**Purpose**: Orchestrate all scanning tools and combine results

**Features**:
- Runs all scanning scripts in sequence
- Handles temporary files
- Combines results into final output
- Provides execution feedback
- Cleanup temporary files (optional)

**Usage**:
```cmd
run_deep_scan_windows.bat "C:\path\to\plugin.dll" "final_output.json"
```

**Output**: Combined JSON with all scan results

---

## Resolution Classification System

Plugins are classified into 5 categories based on detected capabilities:

| Class | Description | Min Width | Max Width |
|-------|-------------|-----------|-----------|
| A | Full resolution support | 640px | 7680px |
| B | Standard resolutions | 320px | 3840px |
| C | Limited resolution | 160px | 1920px |
| D | Low resolution only | 160px | 800px |
| E | Unknown capabilities | - | - |

---

## Detected Winamp Visualization Exports

The scripts look for these common function exports:

- `winampVisGetHeader` - Main entry point (required)
- `winampVisGetHeader2` - Extended header (optional)
- `winampVisGetHeader3` - Latest version (optional)
- `winampVisInit` - Initialization function
- `winampVisRender` - Main rendering function
- `winampVisQuit` - Cleanup/exit function
- `winampVisConfig` - Configuration dialog

---

## Database Integration

Results are stored in SQLite `plugin_deep_scans` table with columns:

- `plugin_file_id` - Reference to plugin_files
- `scan_timestamp` - When the scan was performed
- `scan_method` - "deep_scan_windows_v1"
- `machine_type` - i386, x64, etc.
- `bitness` - 32-bit or 64-bit
- `is_dll` - Boolean
- `subsystem` - Windows subsystem type
- `characteristics` - PE characteristics flags
- `sections_json` - PE sections data
- `exports_json` - Detected exports
- `version_info_json` - Version information
- `supported_exports` - Confirmed Winamp exports
- `estimated_resolution_class` - A-E classification
- `scan_result` - Full JSON result
- `scan_status` - "completed", "failed", etc.

---

## System Requirements

- **Windows 7+** (for WMI)
- **PowerShell 3.0+** (for PE analysis)
- **CScript.exe** (included with Windows)
- **WMI** (Windows Management Instrumentation)

---

## Usage from Rust Application

The Rust backend can call these scripts via:

```rust
// For Windows
Command::new("cmd")
    .args(&["/C", "scantools/scripts/run_deep_scan_windows.bat", dll_path, output_json])
    .output()?;

// Or individual scripts
Command::new("powershell.exe")
    .args(&["-ExecutionPolicy", "Bypass", "-File", "scantools/scripts/analyze_pe.ps1", ...])
    .output()?;
```

---

## Error Handling

Each script produces JSON output even on error:

```json
{
  "error": "Description of what went wrong",
  "source": "Script name",
  "timestamp": "..."
}
```

---

## Performance Notes

- PowerShell PE analysis: ~100-500ms per file
- VBScript metadata extraction: ~200-1000ms
- WMI information gathering: ~300-2000ms (first run slower)
- Total scan time: 1-5 seconds depending on system

---

## Security Considerations

- Scripts only perform read-only operations
- No files are modified or deleted
- All temporary files can be cleaned up
- Scripts don't require administrator rights for basic analysis
- Digital signature checking is non-invasive
