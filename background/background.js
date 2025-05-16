chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Booking Automator installée");
});

// Ex. récupérer des messages du content-script
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log("Message reçu", message, "depuis", sender.tab && sender.tab.url);
  if (message.type === "NOTE") {
    chrome.storage.local.set({ lastNote: message.note });
  }
});
