'use strict';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'highlight',
        title: 'Highlight',
        contexts: ['selection', 'page', 'image', 'link'],
    });

    chrome.contextMenus.onClicked.addListener((data) => {
        console.log(data);
        let value;
        let { selectionText, srcUrl, mediaType, linkUrl, pageUrl } = data;

        if (mediaType === 'image') {
            value = srcUrl;
        } else if (mediaType === 'video') {
            value = srcUrl;
        } else {
            value = linkUrl || selectionText
        }

        chrome.runtime.sendMessage({
            name: 'new-highlight',
            data: {
                value,
                url: pageUrl
            },
        });
    });
});

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (!tab.url) return;

    const url = new URL(tab.url);

    chrome.runtime.sendMessage({
        name: 'new-url',
        data: {
            url: url.href,
            title: tab.title,
        },
    });

    // Enables the side panel on google.com
    await chrome.sidePanel.setOptions({
        tabId,
        path: 'side_panel.html',
        enabled: true
    });
});