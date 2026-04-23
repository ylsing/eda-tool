[简体中文](#) | [English](./README.en.md)

# yhb-eda-tools

嘉立创EDA（EasyEDA）PCB 制造资料导出插件。
目标是让 BOM/Gerber/坐标文件/DXF/3D 的导出更稳定、更可控，并支持统一命名规则。

## 功能概览

- 一键导出以下文件：
  - BOM（`.xlsx`）
  - Gerber（`.zip`）
  - PickAndPlace 坐标（`.xlsx`）
  - DXF（`.dxf`）
  - 3D（`.step`）
- 导出顺序优化：
  - 先生成并保存 BOM
  - 再导出其他文件
- 双模式保存：
  - 批量导出：填写保存路径后，直接写入该目录
  - 逐个另存为：保存路径留空时，系统弹窗逐个保存
- 模板与路径记忆：
  - 记忆 BOM 模板
  - 记忆保存路径（便于下次批量导出）
- 失败处理增强：
  - PCB 上下文校验
  - `Failed to fetch` 轻量重试
  - 错误分类与明细日志

## 文件命名规则

导出文件名统一按以下规则生成（日期取导出当天）：

- BOM: `BOM_Board1_{板名}_{YYYY-MM-DD}.xlsx`
- Gerber: `Gerber_{板名}_{YYYY-MM-DD}.zip`
- DXF: `DXF_{板名}_{YYYY-MM-DD}_AutoCAD2007.dxf`
- 3D: `3D_{板名}_{YYYY-MM-DD}.step`
- PickAndPlace: `PickAndPlace_{板名}_{YYYY_MM_DD}.xlsx`

## 使用说明

1. 在 PCB 页面打开菜单 `电子EDA工具 -> 导出PCB资料`。
2. 选择 BOM 模板。
3. 选择导出方式：
   - 批量导出：在“保存路径”中填写 Windows 绝对路径（如 `G:\测试`）。
   - 逐个另存为：清空“保存路径”后点击导出。
4. 点击“一键导出”，查看结果区日志。

## 重要说明（批量导出）

- 批量导出依赖 `sys_FileSystem.saveFileToFileSystem` 能力（客户端本地文件系统能力与权限）。
- 若客户端环境不支持该能力，插件会自动降级到“逐个另存为”继续导出。
- 当前版本不主动创建本地目录；请先确保目标目录已存在且可写。

## 开发

```bash
npm install
npm run compile
```

打包：

```bash
npm run build
```

产物目录：`./build/dist/`

## 目录结构

- `src/index.ts`: 插件入口、菜单注册、页面打开逻辑
- `iframe/export.html`: 导出页面 UI 与导出核心流程
- `extension.json`: 插件元数据与菜单配置

## 开源许可

[Apache License 2.0](./LICENSE)
