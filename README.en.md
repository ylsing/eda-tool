[简体中文](./README.md) | [English](#)

# yhb-eda-tools

EasyEDA PCB manufacturing export extension.

This plugin exports BOM/Gerber/PickAndPlace/DXF/3D files with stable naming rules and two save modes:

- Batch export to a configured Windows folder path.
- Per-file `Save As` dialogs when no path is provided.

## Features

- Exports:
  - BOM (`.xlsx`)
  - Gerber (`.zip`)
  - PickAndPlace (`.xlsx`)
  - DXF (`.dxf`)
  - 3D (`.step`)
- Export sequence:
  - BOM first, then all other files.
- Remembers:
  - Default BOM template
  - Last output path
- Better resilience:
  - PCB context checks
  - Lightweight retry for `Failed to fetch`
  - Error categorization in result logs

## Naming Rules

- `BOM_Board1_{BoardName}_{YYYY-MM-DD}.xlsx`
- `Gerber_{BoardName}_{YYYY-MM-DD}.zip`
- `DXF_{BoardName}_{YYYY-MM-DD}_AutoCAD2007.dxf`
- `3D_{BoardName}_{YYYY-MM-DD}.step`
- `PickAndPlace_{BoardName}_{YYYY_MM_DD}.xlsx`

## Build

```bash
npm install
npm run compile
```

Package:

```bash
npm run build
```

Output: `./build/dist/`

## Notes

- Batch export depends on `sys_FileSystem.saveFileToFileSystem` availability and permissions in the EasyEDA client environment.
- If batch writing is unavailable, the plugin falls back to per-file `Save As`.
- Local folder auto-creation is not enabled in the current version.

## License

[Apache License 2.0](./LICENSE)
