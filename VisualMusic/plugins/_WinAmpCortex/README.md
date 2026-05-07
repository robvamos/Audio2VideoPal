# WinAmp Cortex

This folder captures a local analysis of the Winamp Portable plugin ecosystem found at:

`F:\WinampPortable\App\Winamp\Plugins`

It is not meant to blindly vendor all of Winamp. It is a design reference and a curated compatibility seed for VisualMusic.

## Process Detection

Winamp Portable can be found from running processes with:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'winamp' } |
  Select-Object ProcessId,Name,ExecutablePath,CommandLine
```

Observed process/root:

- `F:\WinampPortable\WinampPortable.exe`
- Winamp app folder: `F:\WinampPortable\App\Winamp`
- Plugin folder: `F:\WinampPortable\App\Winamp\Plugins`

## How Winamp Splits Work

Winamp uses filename prefixes as architectural boundaries:

- `in_*`: input decoders and media sources
- `out_*`: output backends, including disk output
- `enc_*`: encoders/transcoders
- `dsp_*`: signal processing effects
- `vis_*`: visualization plugins
- `gen_*`: general runtime/UI plugins
- `ml_*`: media library, playlists, history, replay gain, transcode helpers
- `pmp_*`: portable media player/device sync
- `nsvdec_*`: Nullsoft video decoder support

This is a strong design hint for VisualMusic: keep input, output, encoding, visualization hosting, DSP, library/catalog, and device/export workflows as separate modules.

## Companion Folders Matter

Some plugins are not just one DLL. Their sibling folders are likely required for presets, configuration, scripts, skins, or resources.

Observed folders:

- `Milkdrop2`: associated with `vis_milk2.dll`; contains MilkDrop presets/config/resources.
- `AVS`: associated with `vis_avs.dll`; contains AVS presets/config/resources.
- `DSP_SPS`: associated with `dsp_sps.dll`.
- `freeform`: associated with `gen_ff.dll`.
- `ml`: media library support folder.

When copying or testing a plugin, copy the DLL and its associated folder/data files together.

## Curated Copy

The `selected` folder contains a copied subset organized by role:

- `selected/visualization`: `vis_milk2.dll`, `vis_avs.dll`, `vis_avs.dat`, `Milkdrop2`, `AVS`
- `selected/input`: common input/capture DLLs such as `in_mp3.dll`, `in_wave.dll`, `in_flac.dll`, `in_linein.dll`
- `selected/output`: `out_disk.dll`, `out_ds.dll`, `out_wasapi.dll`, `out_wave.dll`
- `selected/encoding`: `enc_lame.dll`, `enc_wav.dll`, `enc_flac.dll`, `enc_vorbis.dll`, `enc_wma.dll`
- `selected/dsp`: `dsp_sps.dll`, `DSP_SPS`
- `selected/media-library`: local library, playlists, history, transcode and replay gain modules
- `selected/general`: hotkeys, tray, media library bootstrap, freeform UI resources

## Design Notes

- Legacy visualization plugins are 32-bit and should be hosted by a separate 32-bit helper process.
- MilkDrop v2.25d uses Direct3D 9 (`d3d9.dll`).
- AVS v2.93 uses DirectDraw-era APIs (`DDRAW.dll`) plus Video for Windows dependencies.
- `out_disk.dll` is relevant as a design reference for file-output/export workflows.
- `enc_*` DLLs are useful references for export/transcode capability modeling, even if the app should prefer FFmpeg for modern encoding.
- `in_linein.dll` is relevant for live input design.
- `ml_playlists.dll`, `ml_history.dll`, and `ml_local.dll` are useful conceptual references for the app playlist/library model.

## Inventory Files

- `inventory/winamp-plugin-inventory.json`: full structured inventory with SHA-256 hashes.
- `inventory/winamp-plugin-inventory.csv`: compact spreadsheet-friendly inventory.
