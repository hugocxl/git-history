<h1 align="center">
  <br>
  <img src="https://raw.githubusercontent.com/hugocxl/git-file-history/master/icon.png" alt="icon" width="100">
  <br>
  Git File History
  <br>
</h1>

<p align="center">
  <strong>Visual git file history with syntax-highlighted diffs</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PRs-welcome-%235FCC6F.svg" alt="PRs welcome!" />

  <img alt="License" src="https://img.shields.io/badge/license-MIT-%235FCC6F">
</p>

Browse through the commit history of any file in your repository with beautiful, side-by-side syntax-highlighted diffs.

![Git File History Demo](https://raw.githubusercontent.com/hugocxl/git-history/master/assets/demo.gif)

## Features

- **Visual Timeline**: Navigate through commits using an intuitive horizontal carousel
- **Syntax Highlighting**: Powered by [Shiki](https://shiki.style/) for accurate, editor-quality syntax highlighting
- **Side-by-Side Diffs**: Compare changes between consecutive commits with a split view
- **Word-Level Diffing**: See exactly what changed at the word level, not just line-by-line
- **Keyboard Navigation**: Use arrow keys to quickly navigate between commits
- **VS Code Native**: Respects your VS Code theme colors and integrates seamlessly

## Usage

### From Explorer

Right-click any file in the Explorer sidebar and select **"Git File History"**.

### From Editor

Right-click anywhere in an open file and select **"Git File History"**.

### From Command Palette

1. Open the file you want to inspect
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Git File History" and press Enter

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Left Arrow` | View previous commit |
| `Right Arrow` | View next commit |

## Requirements

- Visual Studio Code 1.95.0 or higher
- Git installed and available in PATH
- A Git repository with commit history

## Extension Settings

This extension does not add any VS Code settings.

## Known Issues

- Large files with many commits may take a moment to load
- Binary files are not supported

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Acknowledgments

- [Shiki](https://shiki.style/) for syntax highlighting
- [@pierre/diffs](https://www.npmjs.com/package/@pierre/diffs) for the diff viewer component
- Inspired by [git-history](https://github.com/pomber/git-history) by Rodrigo Pombo

---

**Enjoy exploring your git history!**
