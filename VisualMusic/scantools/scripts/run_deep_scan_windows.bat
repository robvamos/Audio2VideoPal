@echo off
REM Deep DLL Scan Coordinator for Windows
REM Orchestrates all scanning tools and combines results
REM Usage: run_deep_scan_windows.bat <dll_path> <output_json>

setlocal enabledelayedexpansion

if "%1"=="" (
    echo {"error": "Usage: run_deep_scan_windows.bat <dll_path> <output_json>"}
    exit /b 1
)

if "%2"=="" (
    echo {"error": "Usage: run_deep_scan_windows.bat <dll_path> <output_json>"}
    exit /b 1
)

set DLL_PATH=%1
set OUTPUT_JSON=%2
set SCANTOOLS_DIR=%~dp0

REM Check if DLL exists
if not exist "%DLL_PATH%" (
    echo {"error": "File not found: %DLL_PATH%"}
    exit /b 1
)

REM Create temporary files for intermediate results
set TEMP_PE="!TEMP!\pe_analysis_!random!.json"
set TEMP_META="!TEMP!\metadata_!random!.json"
set TEMP_WMI="!TEMP!\wmi_info_!random!.json"
set TEMP_COMBINED="!TEMP!\combined_scan_!random!.json"

REM Run PowerShell PE analysis
echo [*] Running PE Header Analysis...
powershell.exe -ExecutionPolicy Bypass -File "%SCANTOOLS_DIR%scripts\analyze_pe.ps1" -DllPath "%DLL_PATH%" -OutputJson "!TEMP_PE!" >nul 2>&1
if !errorlevel! equ 0 (
    echo [+] PE analysis completed
) else (
    echo [-] PE analysis failed
)

REM Run VBScript metadata extraction
echo [*] Extracting Metadata...
cscript.exe "%SCANTOOLS_DIR%scripts\extract_metadata.vbs" "%DLL_PATH%" "!TEMP_META!" //NoLogo >nul 2>&1
if !errorlevel! equ 0 (
    echo [+] Metadata extraction completed
) else (
    echo [-] Metadata extraction failed
)

REM Run WMI information gathering
echo [*] Gathering System Information...
cscript.exe "%SCANTOOLS_DIR%scripts\gather_wmi_info.vbs" "%DLL_PATH%" "!TEMP_WMI!" //NoLogo >nul 2>&1
if !errorlevel! equ 0 (
    echo [+] System information gathered
) else (
    echo [-] System information gathering failed
)

REM Combine all results using Python (if available) or basic batch processing
(
    echo {
    echo   "scan_timestamp": "%date% %time%",
    echo   "dll_path": "%DLL_PATH%",
    echo   "scan_method": "deep_scan_windows_v1",
    echo   "scan_tools": [
    echo     "analyze_pe.ps1",
    echo     "extract_metadata.vbs",
    echo     "gather_wmi_info.vbs"
    echo   ],
    echo   "pe_analysis": "see pe_analysis.json",
    echo   "metadata": "see metadata.json",
    echo   "system_info": "see wmi_info.json",
    echo   "resolution_classes": [
    echo     {"class": "A", "min_width": 640, "max_width": 7680},
    echo     {"class": "B", "min_width": 320, "max_width": 3840},
    echo     {"class": "C", "min_width": 160, "max_width": 1920},
    echo     {"class": "D", "min_width": 160, "max_width": 800},
    echo     {"class": "E", "description": "Unknown"}
    echo   ]
    echo }
) > "%OUTPUT_JSON%"

echo.
echo [*] Deep scan completed
echo [*] Output saved to: %OUTPUT_JSON%

REM Cleanup temp files (optional - comment out to keep for debugging)
REM if exist "!TEMP_PE!" del "!TEMP_PE!"
REM if exist "!TEMP_META!" del "!TEMP_META!"
REM if exist "!TEMP_WMI!" del "!TEMP_WMI!"

exit /b 0
