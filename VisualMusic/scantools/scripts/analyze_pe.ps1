# Advanced PE Header Analysis for Winamp Visualization Plugins
# PowerShell script for Windows-specific PE analysis
# Usage: powershell.exe -ExecutionPolicy Bypass -File analyze_pe.ps1 -DllPath <path> -OutputJson <output>

param(
    [string]$DllPath,
    [string]$OutputJson
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrEmpty($DllPath) -or [string]::IsNullOrEmpty($OutputJson)) {
    Write-Host '{"error": "Usage: analyze_pe.ps1 -DllPath <path> -OutputJson <output>"}'
    exit 1
}

if (-not (Test-Path $DllPath)) {
    Write-Host '{\"error\": \"File not found: ' + $DllPath + '\"}'
    exit 1
}

try {
    $fileInfo = Get-Item $DllPath
    $bytes = [System.IO.File]::ReadAllBytes($DllPath)
    
    # Parse DOS header
    $dos_signature = [System.BitConverter]::ToUInt16($bytes, 0)
    $pe_offset = [System.BitConverter]::ToUInt32($bytes, 0x3C)
    
    if ($dos_signature -ne 0x5A4D) {
        Write-Host '{\"error\": \"Not a valid PE file (missing MZ signature)\"}'
        exit 1
    }
    
    # Parse PE header
    $pe_signature = [System.BitConverter]::ToUInt32($bytes, $pe_offset)
    if ($pe_signature -ne 0x4550) {  # "PE\0\0"
        Write-Host '{\"error\": \"Not a valid PE file (missing PE signature)\"}'
        exit 1
    }
    
    # Parse COFF header
    $machine = [System.BitConverter]::ToUInt16($bytes, $pe_offset + 4)
    $numSections = [System.BitConverter]::ToUInt16($bytes, $pe_offset + 6)
    $timestamp = [System.BitConverter]::ToUInt32($bytes, $pe_offset + 8)
    $optHeaderSize = [System.BitConverter]::ToUInt16($bytes, $pe_offset + 20)
    $characteristics = [System.BitConverter]::ToUInt16($bytes, $pe_offset + 22)
    
    # Machine type mapping
    $machineTypes = @{
        0x014c = "i386"
        0x0200 = "i860"
        0x0268 = "mips"
        0x0366 = "mips16"
        0x0466 = "mipsfpu"
        0x01d3 = "parisc"
        0x01f0 = "ppc32"
        0x01f1 = "ppcfp"
        0x0162 = "r3000"
        0x0166 = "r4000"
        0x01a2 = "sh3"
        0x01a3 = "sh3dsp"
        0x01a6 = "sh4"
        0x01a8 = "sh5"
        0x01c0 = "arm"
        0x01c4 = "thumb"
        0x01d0 = "tricore"
        0x8664 = "x64"
    }
    
    $machineType = $machineTypes[[uint16]$machine]
    if ([string]::IsNullOrEmpty($machineType)) {
        $machineType = "Unknown (0x" + $machine.ToString("X4") + ")"
    }
    
    $bitness = if ($machine -eq 0x8664) { "64-bit" } else { "32-bit" }
    $isDll = ($characteristics -band 0x2000) -eq 0x2000
    
    # Parse optional header
    $optHeaderOffset = $pe_offset + 24
    $magic = [System.BitConverter]::ToUInt16($bytes, $optHeaderOffset)
    $subsystem = [System.BitConverter]::ToUInt16($bytes, $optHeaderOffset + 4)
    
    # Read sections
    $sections = @()
    $sectionHeaderOffset = $optHeaderOffset + $optHeaderSize
    
    for ($i = 0; $i -lt $numSections; $i++) {
        $sectionOffset = $sectionHeaderOffset + ($i * 40)
        if ($sectionOffset + 40 -le $bytes.Length) {
            $sectionNameBytes = $bytes[$sectionOffset..($sectionOffset + 7)]
            $sectionName = [System.Text.Encoding]::ASCII.GetString($sectionNameBytes).TrimEnd([char]0)
            
            $virtualSize = [System.BitConverter]::ToUInt32($bytes, $sectionOffset + 8)
            $virtualAddress = [System.BitConverter]::ToUInt32($bytes, $sectionOffset + 12)
            $rawSize = [System.BitConverter]::ToUInt32($bytes, $sectionOffset + 16)
            $rawAddress = [System.BitConverter]::ToUInt32($bytes, $sectionOffset + 20)
            $sectionChars = [System.BitConverter]::ToUInt32($bytes, $sectionOffset + 36)
            
            $sectionObj = @{
                name = $sectionName
                virtual_size = $virtualSize
                virtual_address = $virtualAddress
                raw_size = $rawSize
                raw_address = $rawAddress
                characteristics = $sectionChars
            }
            $sections += $sectionObj
        }
    }
    
    # Look for common Winamp visualization exports in string table
    $exports = @()
    $exportNames = @(
        "winampVisGetHeader",
        "winampVisGetHeader2",
        "winampVisGetHeader3",
        "winampVisInit",
        "winampVisRender",
        "winampVisQuit",
        "winampVisConfig"
    )
    
    $bytesString = [System.Text.Encoding]::ASCII.GetString($bytes)
    foreach ($exportName in $exportNames) {
        if ($bytesString -like "*$exportName*") {
            $exports += $exportName
        }
    }
    
    # Build result object
    $result = @{
        file_path = $DllPath
        file_size = $fileInfo.Length
        created_time = $fileInfo.CreationTime.ToString("O")
        modified_time = $fileInfo.LastWriteTime.ToString("O")
        machine_type = $machineType
        bitness = $bitness
        is_dll = $isDll
        subsystem = $subsystem
        characteristics = $characteristics
        sections_count = $numSections
        sections = $sections
        detected_exports = $exports
        timestamp_offset = $timestamp
    }
    
    $jsonResult = $result | ConvertTo-Json -Depth 10
    
    # Write to file and output
    $jsonResult | Out-File -FilePath $OutputJson -Encoding UTF8
    Write-Host $jsonResult
}
catch {
    $errorObj = @{
        error = $_.Exception.Message
        source = $_.InvocationInfo.ScriptName
    }
    $errorJson = $errorObj | ConvertTo-Json
    Write-Host $errorJson
    exit 1
}
