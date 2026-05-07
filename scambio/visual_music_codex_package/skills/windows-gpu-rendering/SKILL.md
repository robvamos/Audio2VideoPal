# Skill: Windows GPU Rendering

## Purpose

Implement performant Windows rendering for native visualizers and export.

## Guidance

- Use offscreen render targets for batch/headless.
- Support independent live/export resolution.
- Minimize frame copies.
- Plan DirectX/OpenGL/Vulkan interop.
- For plugin windows, support capture and scaling.
- Record resolution capability per visualizer/plugin.
