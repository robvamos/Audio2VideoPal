# Winamp Plugin Architecture Notes

## Observed installation

Winamp Portable is running from `F:\WinampPortable`.

Plugin folder:

`F:\WinampPortable\App\Winamp\Plugins`

Important visualization plugins:

- `vis_milk2.dll` - MilkDrop v2.25d
- `vis_avs.dll` - Advanced Visualization Studio v2.93
- `vis_avs.dat` - AVS companion data file

## Plugin families

Winamp separates responsibilities by filename prefix:

- `in_*` - input decoders and media readers
- `out_*` - audio output backends
- `enc_*` - encoders
- `dsp_*` - DSP processing
- `vis_*` - visualization plugins
- `gen_*` - general UI/runtime extensions
- `ml_*` - media library modules
- `pmp_*` - portable media player/device modules
- `nsvdec_*` - Nullsoft video decoder support

This is useful for VisualMusic design: keep playback, decoding, output, visualization hosting, scanning, and export as separate modules rather than one large media runtime.

## MilkDrop and AVS scan results

Both `vis_milk2.dll` and `vis_avs.dll` are 32-bit PE DLLs and export the classic Winamp visualization entrypoint:

`winampVisGetHeader`

Observed native dependencies:

MilkDrop v2.25d (`vis_milk2.dll`):

- `d3d9.dll`
- `SHLWAPI.dll`
- `KERNEL32.dll`
- `USER32.dll`
- `GDI32.dll`
- `ADVAPI32.dll`
- `SHELL32.dll`
- `MSVCP140.dll`
- `VCRUNTIME140.dll`
- `WINMM.dll`
- Universal CRT API DLLs
- Delay-load: `vms_desktop.dll`

Advanced Visualization Studio v2.93 (`vis_avs.dll`):

- `DDRAW.dll`
- `MSVFW32.dll`
- `AVIFIL32.dll`
- `KERNEL32.dll`
- `USER32.dll`
- `GDI32.dll`
- `COMDLG32.dll`
- `ADVAPI32.dll`
- `SHELL32.dll`
- `VCRUNTIME140.dll`
- Universal CRT API DLLs

## Design implications

- Host legacy Winamp visualizers out-of-process, preferably with a dedicated 32-bit helper process.
- Treat MilkDrop and AVS as different rendering backends: MilkDrop uses Direct3D 9, AVS uses DirectDraw/video-for-Windows-era APIs.
- Do not load 32-bit visualization DLLs directly into a 64-bit Tauri/Rust process.
- Keep an explicit plugin catalog with category, bitness, exports, dependencies, compatibility notes, and required runtime components.
- Keep modern rendering independent from legacy hosting so a future DirectX 11/12, OpenGL, Vulkan, or projectM path can coexist with Winamp compatibility.

## Database rule

Every plugin analysis must be recorded in SQLite.

Before a scan stores detailed results, the app must create or update a `plugin_files` row with:

- absolute path
- filename and extension
- size
- SHA-256
- architecture or `unknown`
- last seen/scanned timestamps
- category note inferred from the Winamp prefix when available

Detailed scan results then go into `plugin_deep_scans`, linked by `plugin_file_id`. This applies to local `VisualMusic/plugins` files and external Winamp files such as `F:\WinampPortable\App\Winamp\Plugins\vis_milk2.dll`.
