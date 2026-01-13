import * as path from "node:path";
import * as vscode from "vscode";
import { getCommits } from "./git";
import type { ToExtensionMessage, ToWebviewMessage } from "./types";

/** Get the path to the worker-portable.js file from @pierre/diffs */
function getWorkerPath(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(
    context.extensionUri,
    "node_modules",
    "@pierre",
    "diffs",
    "dist",
    "worker",
    "worker-portable.js"
  );
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "git-file-history.show",
    async (uri?: vscode.Uri) => {
      // Get file path from context menu or active editor
      const filePath =
        uri?.fsPath ?? vscode.window.activeTextEditor?.document.fileName;

      if (!filePath) {
        vscode.window.showErrorMessage("No file selected");
        return;
      }

      const fileName = path.basename(filePath);
      const workerPath = getWorkerPath(context);
      const panel = vscode.window.createWebviewPanel(
        "gitFileHistory",
        `${fileName} History`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "dist", "webview"),
            // Include worker directory for @pierre/diffs worker pool
            vscode.Uri.joinPath(
              context.extensionUri,
              "node_modules",
              "@pierre",
              "diffs",
              "dist",
              "worker"
            ),
          ],
        }
      );

      const workerUri = panel.webview.asWebviewUri(workerPath);
      panel.webview.html = getWebviewContent(
        panel.webview,
        context.extensionUri,
        workerUri.toString()
      );

      // Handle messages from webview
      panel.webview.onDidReceiveMessage(
        async (message: ToExtensionMessage) => {
          switch (message.type) {
            case "ready":
              sendMessage(panel.webview, {
                type: "init",
                filePath,
                fileName,
              });
              break;

            case "loadMore":
              try {
                const { commits, hasMore } = await getCommits(
                  filePath,
                  15,
                  message.before
                );
                sendMessage(panel.webview, {
                  type: "commits",
                  commits,
                  hasMore,
                });
              } catch (error) {
                sendMessage(panel.webview, {
                  type: "error",
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
              break;
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(disposable);
}

function sendMessage(webview: vscode.Webview, message: ToWebviewMessage) {
  webview.postMessage(message);
}

function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  workerUri: string
): string {
  const webviewUri = vscode.Uri.joinPath(extensionUri, "dist", "webview");
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewUri, "index.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewUri, "index.css")
  );

  const nonce = getNonce();

  // CSP needs:
  // - wasm-unsafe-eval for Shiki WASM
  // - worker-src blob: for worker pool blob URLs
  // - connect-src for fetching worker script
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; worker-src blob:; connect-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Git File History</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    // Pass worker URI to the webview for the worker pool
    window.__DIFFS_WORKER_URI__ = "${workerUri}";
  </script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function deactivate() {}
