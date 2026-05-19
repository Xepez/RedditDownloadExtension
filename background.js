chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download") {
        const url = message.url;
        const filename = url.split('/').pop().split('?')[0];
        chrome.downloads.download({
            url: url,
            filename: filename
        });
    }
});