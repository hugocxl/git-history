# Installation Guide

## VS Code Marketplace (Recommended)

The easiest way to install Git File Timeline is through the VS Code Marketplace:

1. Open VS Code
2. Go to the Extensions view (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` on Windows/Linux)
3. Search for "Git File Timeline"
4. Click **Install**

Or install directly from the command line:

```bash
code --install-extension hugocxl.git-file-timeline
```

## Manual Installation (VSIX)

If you prefer to install manually or need a specific version:

### Download from Releases

1. Go to the [Releases page](https://github.com/hugocxl/git-history/releases)
2. Download the `.vsix` file from the latest release
3. In VS Code, go to Extensions view
4. Click the `...` menu (top-right of Extensions sidebar)
5. Select **Install from VSIX...**
6. Choose the downloaded `.vsix` file

### Build from Source

```bash
# Clone the repository
git clone https://github.com/hugocxl/git-history.git
cd git-history

# Install dependencies
pnpm install

# Build the extension
pnpm build

# Package as VSIX
pnpm package
```

This creates a `.vsix` file in the project root that you can install manually.

## Requirements

- **VS Code**: Version 1.108.0 or higher
- **Git**: Must be installed and available in your system PATH
- **Repository**: The extension only works within Git repositories

## Verify Installation

1. Open a Git repository in VS Code
2. Right-click on any file in the Explorer
3. You should see **"Git File Timeline"** in the context menu

## Troubleshooting

### "Git not found" error

Make sure Git is installed and accessible:

```bash
git --version
```

If not installed, download from [git-scm.com](https://git-scm.com/).

### Extension not appearing

1. Reload VS Code (`Cmd+Shift+P` > "Developer: Reload Window")
2. Check that the extension is enabled in Extensions view
3. Ensure you're in a Git repository (look for `.git` folder)

### Diff not loading

- Check that the file has commit history (`git log --oneline <filename>`)
- Large files may take longer to process
- Binary files are not supported

## Uninstallation

1. Go to Extensions view
2. Find "Git File Timeline"
3. Click **Uninstall**

Or from command line:

```bash
code --uninstall-extension hugocxl.git-file-timeline
```
