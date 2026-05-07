#!/usr/bin/env python3
"""
Deep DLL Analyzer for Winamp Visualization Plugins
Analyzes PE structure, exports, imports, version info, and more.
"""

import sys
import json
import struct
import os
from pathlib import Path

def analyze_dll(dll_path):
    """Analyze a DLL file and return detailed information."""
    
    result = {
        "file_path": dll_path,
        "exists": os.path.exists(dll_path),
        "size_bytes": os.path.getsize(dll_path) if os.path.exists(dll_path) else 0,
        "pe_signature": None,
        "machine_type": None,
        "characteristics": None,
        "subsystem": None,
        "export_table": [],
        "import_tables": {},
        "resources": [],
        "version_info": {},
        "debug_info": None,
        "sections": [],
        "bitness": None,
        "is_dll": False,
        "error": None
    }
    
    try:
        with open(dll_path, 'rb') as f:
            # Read DOS header
            dos_header = f.read(64)
            if dos_header[:2] != b'MZ':
                result["error"] = "Not a valid PE file (missing MZ signature)"
                return result
            
            # Get PE offset
            pe_offset = struct.unpack('<I', dos_header[60:64])[0]
            f.seek(pe_offset)
            
            # Read PE signature
            pe_sig = f.read(4)
            if pe_sig != b'PE\x00\x00':
                result["error"] = "Not a valid PE file (missing PE signature)"
                return result
            
            result["pe_signature"] = "PE32"
            
            # Read COFF header
            coff_header = f.read(20)
            machine, num_sections, timestamp, sym_table_ptr, num_syms, opt_header_size, characteristics = struct.unpack('<HHIIIHH', coff_header)
            
            # Machine type
            machine_types = {
                0x014c: "i386",
                0x0200: "i860",
                0x0268: "mips",
                0x0366: "mips16",
                0x0466: "mipsfpu",
                0x0466: "mipsfpu16",
                0x01d3: "parisc",
                0x01f0: "ppc32",
                0x01f1: "ppcfp",
                0x0162: "r3000",
                0x0166: "r4000",
                0x0166: "r10000",
                0x01a2: "sh3",
                0x01a3: "sh3dsp",
                0x01a6: "sh4",
                0x01a8: "sh5",
                0x01c0: "arm",
                0x01c4: "thumb",
                0x01d0: "tricore",
                0x0266: "mips16fpu",
                0x0ebc: "efx",
                0x8664: "x64"
            }
            result["machine_type"] = machine_types.get(machine, f"Unknown ({hex(machine)})")
            result["bitness"] = "64-bit" if machine == 0x8664 else "32-bit"
            
            # Characteristics
            chars = {
                0x0002: "EXECUTABLE_IMAGE",
                0x0004: "LINE_NUMS_STRIPPED",
                0x0008: "LOCAL_SYMS_STRIPPED",
                0x0010: "AGGRESSIVE_WS_TRIM",
                0x0020: "LARGE_ADDRESS_AWARE",
                0x0040: "BYTES_REVERSED_LO",
                0x0080: "32BIT_MACHINE",
                0x0100: "DEBUG_STRIPPED",
                0x0200: "REMOVABLE_RUN_FROM_SWAP",
                0x0400: "NET_RUN_FROM_SWAP",
                0x0800: "SYSTEM",
                0x1000: "DLL",
                0x2000: "UP_SYSTEM_ONLY",
                0x4000: "BYTES_REVERSED_HI"
            }
            result["characteristics"] = [v for k, v in chars.items() if characteristics & k]
            result["is_dll"] = bool(characteristics & 0x1000)
            
            # Subsystem
            subsystems = {
                0: "UNKNOWN",
                1: "NATIVE",
                2: "WINDOWS_GUI",
                3: "WINDOWS_CUI",
                5: "OS2_CUI",
                7: "POSIX_CUI",
                8: "WINDOWS_CE_GUI",
                9: "EFI_APPLICATION",
                10: "EFI_BOOT_SERVICE_DRIVER",
                11: "EFI_RUNTIME_DRIVER",
                12: "EFI_ROM",
                13: "XBOX",
                14: "WINDOWS_BOOT_APPLICATION"
            }
            
            # Read optional header to get subsystem
            opt_header = f.read(opt_header_size)
            if len(opt_header) >= 68:
                subsystem = struct.unpack('<H', opt_header[4:6])[0]
                result["subsystem"] = subsystems.get(subsystem, f"Unknown ({subsystem})")
            
            # Parse sections
            for i in range(num_sections):
                section_header = f.read(40)
                if len(section_header) < 40:
                    break
                section_name = section_header[:8].rstrip(b'\x00').decode('ascii', errors='ignore')
                section_info = {
                    "name": section_name,
                    "virtual_size": struct.unpack('<I', section_header[8:12])[0],
                    "virtual_address": struct.unpack('<I', section_header[12:16])[0],
                    "raw_size": struct.unpack('<I', section_header[16:20])[0],
                    "raw_address": struct.unpack('<I', section_header[20:24])[0],
                    "characteristics": struct.unpack('<I', section_header[36:40])[0]
                }
                result["sections"].append(section_info)
        
        # Try to extract version info using strings
        result["version_info"] = extract_version_info(dll_path)
        
    except Exception as e:
        result["error"] = str(e)
    
    return result


def extract_version_info(dll_path):
    """Extract version information from DLL."""
    version_info = {}
    try:
        with open(dll_path, 'rb') as f:
            content = f.read()
            
        # Look for version string patterns
        strings_to_find = [
            b'CompanyName',
            b'ProductName',
            b'FileDescription',
            b'ProductVersion',
            b'FileVersion',
            b'OriginalFilename',
            b'InternalName'
        ]
        
        for search_str in strings_to_find:
            if search_str in content:
                idx = content.find(search_str)
                # Extract context around the string
                start = max(0, idx - 50)
                end = min(len(content), idx + len(search_str) + 200)
                chunk = content[start:end]
                
                # Try to extract the value after the key
                try:
                    key = search_str.decode('ascii', errors='ignore')
                    # Find string value after the key
                    value_start = chunk.find(b'\x00', len(search_str))
                    if value_start != -1:
                        value = chunk[value_start+1:value_start+100].split(b'\x00')[0]
                        value_str = value.decode('ascii', errors='ignore').strip()
                        if value_str:
                            version_info[key] = value_str
                except:
                    pass
    except:
        pass
    
    return version_info


def check_exports(dll_path):
    """Check for common Winamp visualization exports."""
    exports = []
    common_exports = [
        'winampVisGetHeader',
        'winampVisGetHeader2',
        'winampVisGetHeader3',
        'winampVisInit',
        'winampVisRender',
        'winampVisQuit',
        'winampVisConfig'
    ]
    
    # This is a simplified check - real implementation would use pefile or similar
    try:
        with open(dll_path, 'rb') as f:
            content = f.read()
        
        for export in common_exports:
            if export.encode('ascii') in content:
                exports.append(export)
    except:
        pass
    
    return exports


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: dll_analyzer.py <dll_path>"}))
        sys.exit(1)
    
    dll_path = sys.argv[1]
    result = analyze_dll(dll_path)
    result["exports"] = check_exports(dll_path)
    print(json.dumps(result, indent=2))
