# Important Context for Git History

## Project Status

- **Stable**: This is a mature, production project used by thousands of developers
- **Maintenance Mode**: Active but not heavily developed; focus on stability
- **Author**: @pomber (Rodrigo Pombo)

## Technical Constraints

### React Version
- Uses React 16.8.x (not latest React 18)
- Uses `React.unstable_ConcurrentMode` (legacy API)
- Hooks are available but some patterns are pre-hooks era

### Browser Compatibility
- Targets modern browsers (see `browserslist` in package.json)
- No IE11 support
- Web workers required (for versioner)

### Build System
- Create React App (CRA) with CRACO for customization
- Cannot eject; modifications through craco.config.js
- workerize-loader for web workers needs special webpack config

## Architecture Decisions

### Why Three Packages?
- **Web**: Hosted on githistory.xyz, works via URL manipulation
- **CLI**: For developers who want to use it locally without internet
- **VS Code**: For tighter IDE integration

### Why Web Workers?
- Diff calculation and syntax highlighting are CPU-intensive
- Web worker prevents UI blocking during commit processing
- EXCEPTION: VS Code webview doesn't support workers, so vscode-provider processes inline

### Why Custom Animation Framework (Airframe)?
- React's reconciliation conflicts with animation timing
- Needed declarative way to define staggered, sequenced animations
- Built specifically for this project's slide transition needs

## Common Gotchas

### Provider Selection
The `REACT_APP_GIT_PROVIDER` env var controls build-time provider bundling:
- Not set: All web providers (github, gitlab, bitbucket) included
- `cli`: Only CLI provider
- `vscode`: Only VS Code provider (no web workers!)

### URL Structure
Web app URLs mirror original repo URLs:
```
Original:  github.com/owner/repo/blob/branch/path/file.js
Git History: github.githistory.xyz/owner/repo/blob/branch/path/file.js
```

### Authentication
- Uses Netlify Identity for OAuth with GitHub/GitLab/Bitbucket
- Tokens stored in localStorage
- Rate limiting is real; unauthenticated GitHub API is 60 req/hour

### CSS-in-JS vs CSS Files
Mixed approach:
- Component styles: inline `style` objects
- Global/scrollbar styles: CSS files
- Theme/syntax colors: JS objects (`nightOwl.js`)

## Dependencies to Know

### Core
- **prismjs**: Syntax highlighting (supports 200+ languages)
- **diff (jsdiff)**: Text diffing algorithm
- **rebound**: Facebook's spring physics library

### Build
- **craco**: CRA Configuration Override
- **workerize-loader**: Web worker bundling

### CLI/VS Code
- **execa**: Modern child_process wrapper (for git commands)
- **koa**: HTTP server for CLI
- **vscode**: VS Code extension API types

## File Organization Notes

### Git Providers Folder
This is the most complex part of the codebase:
```
git-providers/
├── sources.js              # "Which source am I?"
├── providers.js            # "Give me the right provider"
├── *-provider.js           # "How do I auth and get params?"
├── *-commit-fetcher.js     # "How do I fetch commits?"
├── versioner.js            # "Load the worker"
├── versioner.worker.js     # "Do the heavy lifting"
├── differ.js               # "Diff two versions"
├── tokenizer.js            # "Syntax highlight"
└── language-detector.js    # "What language is this?"
```

### Why Both Provider and Fetcher?
- **Provider**: UI-facing (auth, URL parsing, React components)
- **Fetcher**: Data-fetching (API calls, response parsing)
- Separation allows versioner.worker.js to import only fetchers

## Testing Notes

### Current Test Coverage
- Unit tests for utility functions
- Language detection tests (comprehensive)
- VS Code extension has placeholder tests

### What's NOT Tested
- React components (no enzyme/testing-library setup)
- Integration tests
- E2E tests
- Animation behavior

### Running Tests
```bash
yarn test           # Full suite (prettier + jest)
yarn test-cra       # Jest only (useful for watch mode)
yarn test-prettier  # Formatting only
```

## Performance Considerations

### Large Files
- Virtual scrolling handles large files well
- Syntax highlighting is the bottleneck
- Web worker prevents UI freezes

### Many Commits
- Lazy loading: fetches 10 commits at a time
- Scroll near end triggers `loadMore()`
- Commit data is cached per file path

### Animation Performance
- Spring physics runs at 60fps
- Staggered animations reduce simultaneous DOM updates
- CSS transforms used for smooth animations

## Known Limitations

1. **Binary files**: Not supported (will show empty or garbage)
2. **Very large files**: May cause performance issues
3. **Renamed files**: History may not follow renames
4. **Private repos**: Require authentication
5. **Rate limits**: GitHub API limits (60/hour unauthenticated)
6. **WebView restrictions**: VS Code webview has limitations vs browser
