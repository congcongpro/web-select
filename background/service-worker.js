chrome.commands.onCommand.addListener((command) => {
  if (command !== "run-select") return;
  (async () => {
    const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    httpTab = tab.url.startsWith('http');
    if (httpTab) {
      const response = await chrome.tabs.sendMessage(tab.id, {commandRun: true});
      console.log(response);
    }
  })();
});