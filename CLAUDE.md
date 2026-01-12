# CLAUDE.md - Git History Project Guide

## Project Overview

Git History is a visual tool for browsing the git history of any file with animated transitions between commits. It supports multiple platforms:

- **Web App** (githistory.xyz) - Works with GitHub, GitLab, and Bitbucket URLs
- **CLI Tool** (`npx git-file-history`) - Works with local git repositories
- **VS Code Extension** ("Git File History") - Integrated into the editor

## Repository Architecture

This is a **monorepo** with three packages sharing a common React frontend:

```
git-history/
├── src/                    # Web app + shared React frontend
│   ├── git-providers/      # Provider abstraction layer
│   └── airframe/           # Custom animation framework
├── cli/                    # npm CLI package
├── vscode-ext/             # VS Code extension
└── public/                 # Static assets
```

## Quick Commands

```bash
# Development (web app)
yarn start              # Start dev server with hot reload

# Testing
yarn test               # Run prettier check + jest tests
yarn test-cra           # Run jest tests only
yarn test-prettier      # Check formatting only

# Build
yarn build              # Production build (web)
cd cli && yarn build    # Build CLI (includes building web with cli provider)
cd vscode-ext && yarn build  # Build VS Code extension

# Formatting
yarn format             # Auto-format all files with prettier

# Storybook
yarn storybook          # Component development environment
```

## Core Architecture

### Git Provider System (`src/git-providers/`)

The provider abstraction allows the same React UI to work with different git sources:

| File | Purpose |
|------|---------|
| `sources.js` | Detects which source to use (github/gitlab/bitbucket/cli/vscode) |
| `providers.js` | Factory that returns the appropriate provider |
| `*-provider.js` | Provider implementation (auth, URL parsing, getVersions) |
| `*-commit-fetcher.js` | Fetches commit data from respective APIs |
| `versioner.js` | Entry point (loads web worker) |
| `versioner.worker.js` | Web worker: fetches commits, tokenizes, diffs |
| `differ.js` | Line-based diffing using jsdiff library |
| `tokenizer.js` | Syntax highlighting using Prism.js |
| `language-detector.js` | Maps file extensions to Prism languages |

**Data Flow:**
```
Provider.getVersions(last)
  → Fetcher.getCommits(params)  # Get commit metadata + file content
  → getSlides(codes, lang)      # Compute diffs between versions
  → For each commit: { commit, lines, changes }
```

### UI Component Hierarchy

```
App
├── Landing (when no file specified)
└── InnerApp
    └── History
        ├── CommitList (horizontal carousel header)
        └── Slides (swipeable content)
            └── Slide
                └── Scroller (virtualized code display)
```

### Animation System (`src/airframe/`)

Custom JSX-based declarative animation framework:

```jsx
// Example from animation.js
<chain durations={[0.5, 0.5]}>
  <SwitchLines filterExit={...} filterEnter={...} />
  <SwitchLines filterExit={...} filterEnter={...} />
</chain>
```

Key primitives: `<parallel>`, `<chain>`, `<tween>`, `<delay>`, `<Stagger>`

### Key React Patterns

- **Concurrent Mode**: Uses `React.unstable_ConcurrentMode` (React 16.x)
- **Hooks**: Custom hooks for springs (`use-spring.js`), virtual children
- **State Management**: Local state with `useState`, `useReducer`
- **Spring Physics**: Uses `rebound` library for smooth animations

## Build Configuration

### Environment Variables

| Variable | Values | Effect |
|----------|--------|--------|
| `REACT_APP_GIT_PROVIDER` | `cli`, `vscode` | Selects which provider to bundle |
| `PUBLIC_URL` | `.` | For VS Code extension (relative paths) |

### CRACO Configuration

`craco.config.js` configures webpack to set `globalObject: "this"` for workerize-loader compatibility.

## Provider-Specific Details

### Web (GitHub/GitLab/Bitbucket)
- URL pattern: `github.githistory.xyz/{owner}/{repo}/blob/{branch}/{path}`
- Auth via Netlify Identity (`netlify-auth-providers`)
- API rate limiting handled with login prompts

### CLI
- Spawns Koa server serving the built React app
- `/api/commits` endpoint calls local git commands via `execa`
- Opens browser automatically

### VS Code Extension
- Embeds pre-built React app in `site/` folder
- Webview panel with message passing for commit data
- Uses local git via `execa` (same as CLI)

## Testing Strategy

- **Unit Tests**: `*.test.js` files using Jest
  - `utils.test.js` - Navigation utilities
  - `language-detector.test.js` - File type detection
- **Component Development**: Storybook (`*.story.js`)
  - `scroller.story.js` - Virtual scroll testing
  - `use-spring.story.js` - Animation hook testing
- **VS Code Extension**: Mocha test suite in `vscode-ext/test/`

## Code Style

- **Formatter**: Prettier (run `yarn format` before committing)
- **Linter**: ESLint with `react-app` config
- **No TypeScript**: Plain JavaScript throughout

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI framework (16.8.x) |
| `prismjs` | Syntax highlighting |
| `diff` (jsdiff) | Line diffing algorithm |
| `rebound` | Spring physics for animations |
| `workerize-loader` | Web workers for heavy computation |
| `react-swipeable` | Touch/swipe handling |
| `execa` | Git command execution (CLI/VS Code) |
| `koa` | HTTP server (CLI) |

## Common Development Tasks

### Adding a New Language

1. Add regex pattern in `src/git-providers/language-detector.js`:
```js
{ lang: "newlang", regex: /\.ext$/i },
```

2. Add any dependencies in `getLanguageDependencies()` if needed

3. Add tests in `language-detector.test.js`

### Modifying Animations

1. Edit `src/animation.js` using airframe primitives
2. Test with different file histories
3. Enable verbose logging: `window.LOG = "verbose"`

### Adding a New Git Provider

1. Create `src/git-providers/{provider}-provider.js`:
   - `showLanding()`, `getPath()`, `getVersions(last)`
2. Create `src/git-providers/{provider}-commit-fetcher.js`:
   - `getCommits(params)` returning array of commit objects
3. Add to `sources.js` SOURCE enum
4. Register in `providers.js` and `versioner.worker.js`

### Debugging

- Browser DevTools for web app
- VS Code: F5 launches extension debug session
- CLI: Console logs + inspect the served HTML
- Animation debugging: Set `window.LOG = "verbose"` in console

## File Reference

### Entry Points
- `src/index.js` - Web app entry
- `cli/cli.js` - CLI entry
- `vscode-ext/extension.js` - VS Code extension entry

### Configuration
- `package.json` - Root package (web app)
- `cli/package.json` - CLI package
- `vscode-ext/package.json` - VS Code extension manifest
- `craco.config.js` - Webpack customization
- `.storybook/config.js` - Storybook setup

### Styles
- `src/nightOwl.js` - Default dark theme (syntax highlighting)
- `src/duotoneLight.js` - Light theme (unused but available)
- `src/*.css` - Component-specific styles
