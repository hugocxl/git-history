const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const getCommits = require("./git");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "extension.git-file-history",
    function() {
      // The code you place here will be executed every time your command is executed
      try {
        const currentPath = getCurrentPath();
        if (!currentPath) {
          vscode.window.showInformationMessage("No active file");
          return;
        }

        const panel = vscode.window.createWebviewPanel(
          "gfh",
          `${path.basename(currentPath)} (Git History)`,
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(context.extensionPath, "site"))
            ]
          }
        );
        const indexPath = path.join(
          context.extensionPath,
          "site",
          "index.html"
        );

        const index = fs.readFileSync(indexPath, "utf-8");
        // Build the webview URI for resources
        const siteUri = panel.webview.asWebviewUri(
          vscode.Uri.file(path.join(context.extensionPath, "site"))
        );

        // CSP to allow Shiki WASM and inline scripts
        const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${siteUri}; style-src 'unsafe-inline' ${siteUri}; img-src ${siteUri} https: data:; font-src ${siteUri}; connect-src ${siteUri} https:;">`;

        const newIndex = index
          .replace(
            "<body>",
            `<body><script>/*<!--*/window.vscode=acquireVsCodeApi();window._PATH=${JSON.stringify(
              currentPath
            )}/*-->*/</script>`
          )
          .replace(
            "<head>",
            `<head>${cspMeta}<base href="${siteUri}/">`
          );

        panel.webview.html = newIndex;

        panel.webview.onDidReceiveMessage(
          message => {
            switch (message.command) {
              case "commits":
                const { path, last = 15, before = null } = message.params;
                getCommits(path, last, before)
                  .then(commits => {
                    panel.webview.postMessage(commits);
                  })
                  .catch(console.error);
            }
          },
          undefined,
          context.subscriptions
        );
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
  );

  context.subscriptions.push(disposable);
}

function getCurrentPath() {
  return (
    vscode.window.activeTextEditor &&
    vscode.window.activeTextEditor.document &&
    vscode.window.activeTextEditor.document.fileName
  );
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
