# Code Patterns in Git History

## React Patterns

### Custom Hook Pattern
```javascript
// Hook with state + effect
function useVersionsLoader(gitProvider) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    gitProvider.getVersions()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState(old => ({ ...old, loading: false, error })));
  }, [dependencies]);

  return [state.data, state.loading, state.error];
}
```

### Spring Animation Hook
```javascript
// From use-spring.js
export default function useSpring({
  target = 0,
  current = null,
  tension = 0,
  friction = 10,
  round = x => x
}) {
  const [spring, setSpring] = useState(null);
  const [value, setValue] = useState(target);
  // ... spring physics logic
  return value;
}
```

### Reducer Pattern for Complex State
```javascript
// From scroller.js
const reducer = (prevState, action) => {
  switch (action.type) {
    case "unsnap":
      return { ...prevState, snap: false };
    case "change-area":
      // complex calculation
      return { ...prevState, areaIndex: newIndex, snap: true };
    case "manual-scroll":
      return { ...prevState, snap: false, currentTop: newTop };
    default:
      throw Error();
  }
};
```

## Provider Pattern

### Git Provider Interface
```javascript
// Every provider exports:
export default {
  showLanding,    // () => boolean
  getPath,        // () => string
  getVersions,    // (last: number) => Promise<Version[]>
  // Optional:
  logIn,          // () => void
  isLoggedIn,     // () => boolean
  LogInButton     // React component
};
```

### Commit Fetcher Interface
```javascript
// Every fetcher exports:
export default {
  getCommits      // (params) => Promise<Commit[]>
};

// Commit shape:
{
  sha: string,
  date: Date,
  author: { login: string, avatar?: string },
  message: string,
  content: string,      // file content at this commit
  commitUrl?: string
}
```

## Airframe Animation Pattern

### Declarative Animation Definition
```javascript
/* @jsx createAnimation */

// Tween: interpolate values
<tween
  from={{ x: 0, opacity: 1 }}
  to={{ x: -250, opacity: 0 }}
  ease={easing.easeInQuad}
/>

// Chain: sequential animations
<chain durations={[0.35, 0.3, 0.35]}>
  <SlideToLeft />
  <ShrinkHeight />
</chain>

// Parallel: simultaneous animations
<parallel>
  <Stagger interval={0.2} filter={filterExit}>
    <ExitAnimation />
  </Stagger>
  <Stagger interval={0.2} filter={filterEnter}>
    <EnterAnimation />
  </Stagger>
</parallel>
```

### Stagger Component
```javascript
// Apply animation with offset per item
<Stagger interval={0.2} filter={line => !line.left && line.middle}>
  <chain durations={[0.35, 0.3, 0.35]}>
    <delay />
    <GrowHeight />
    <SlideFromRight />
  </chain>
</Stagger>
```

## Diff Processing Pattern

### Line Diff with State Tracking
```javascript
// From differ.js
// Each line tracks which slides (versions) it appears in
{
  content: "line content",
  slides: [0, 1, 2],  // indices of versions containing this line
  tokens: [...]       // syntax highlighting tokens
}

// Slide view marks lines relative to adjacent slides
{
  content: "line content",
  left: true,   // appears in previous version
  middle: true, // appears in current version
  right: false, // appears in next version
  key: lineIndex
}
```

## VS Code Extension Pattern

### Webview Communication
```javascript
// Extension side (extension.js)
panel.webview.onDidReceiveMessage(message => {
  switch (message.command) {
    case "commits":
      getCommits(path, last).then(commits => {
        panel.webview.postMessage(commits);
      });
  }
});

// Webview side (vscode-provider.js)
const vscode = window.vscode;
vscode.postMessage({ command: "commits", params: { path, last } });
window.addEventListener("message", event => {
  const commits = event.data;
  // handle commits
});
```

## Test Patterns

### Jest Unit Test
```javascript
describe("nextIndex", () => {
  const fiveItems = [1, 2, 3, 4, 5];

  test("works with middle index", () => {
    expect(nextIndex(fiveItems, 2)).toBe(3);
  });

  test("works with fractions", () => {
    expect(nextIndex(fiveItems, 1.9)).toBe(2);
  });
});
```

### Storybook Story
```javascript
import { storiesOf } from "@storybook/react";

storiesOf("ComponentName", module)
  .add("default", () => <Component />)
  .add("with props", () => <Component prop={value} />);
```

## API Fetch Pattern

### With Caching
```javascript
const cache = {};

async function getCommits({ path, token, last }) {
  if (!cache[path]) {
    const response = await fetch(url, {
      headers: token ? { Authorization: `bearer ${token}` } : {}
    });
    cache[path] = await response.json();
  }
  return cache[path].slice(0, last);
}
```

### Error Handling
```javascript
if (!response.ok) {
  throw {
    status: response.status,
    body: await response.json()
  };
}
```

## Language Detection Pattern

```javascript
// Regex-based with fallback
const filenameRegex = [
  { lang: "js", regex: /\.js$/i },
  { lang: "typescript", regex: /\.ts$/i },
  // ... more patterns
  { lang: "js", regex: /.*/ }  // fallback
];

export function getLanguage(filename) {
  return filenameRegex.find(x => x.regex.test(filename)).lang;
}
```
