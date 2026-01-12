import React from "react";
import animation from "./animation";
import theme from "./nightOwl";
import Scroller from "./scroller";

function getLineHeight(line, i, { styles }) {
  return styles[i].height != null ? styles[i].height : 15;
}

function getTokenStyle(token) {
  // Shiki tokens have color and optional fontStyle directly
  // We use these directly instead of type-based lookup
  const style = {};
  if (token.color) {
    style.color = token.color;
  }
  if (token.fontStyle) {
    // fontStyle from Shiki can be 1 (italic), 2 (bold), or 3 (both)
    if (token.fontStyle & 1) {
      style.fontStyle = "italic";
    }
    if (token.fontStyle & 2) {
      style.fontWeight = "bold";
    }
  }
  return style;
}

function getLine(line, i, { styles }) {
  const style = styles[i];
  return (
    <div
      style={Object.assign({ overflow: "hidden", height: "15px" }, style)}
      key={line.key}
    >
      {!line.tokens.length && <br />}
      {line.tokens.map((token, i) => {
        const tokenStyle = getTokenStyle(token);
        return (
          <span style={tokenStyle} key={i}>
            {token.content}
          </span>
        );
      })}
    </div>
  );
}

function Slide({ lines, styles, changes }) {
  return (
    <pre
      style={{
        backgroundColor: theme.plain.backgroundColor,
        color: theme.plain.color,
        paddingTop: "100px",
        margin: 0,
        height: "100%",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <Scroller
        items={lines}
        getRow={getLine}
        getRowHeight={getLineHeight}
        data={{ styles }}
        snapAreas={changes}
      />
    </pre>
  );
}

export default function SlideWrapper({ time, version }) {
  const { lines, changes } = version;
  const styles = animation((time + 1) / 2, lines);
  return <Slide lines={lines} styles={styles} changes={changes} />;
}
