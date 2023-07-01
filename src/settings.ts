import { publishingRelays } from './ndk';

export function showSettings() {
    document.getElementById('app')!.style.display = 'none';
    document.getElementById('settings')!.style.display = 'block';
}

export function showApp() {
    document.getElementById('app')!.style.display = 'block';
    document.getElementById('settings')!.style.display = 'none';

    // get value of npub and show it in #npub
    chrome.storage.sync.get(['npub'], ({npub}) => {
        (document.getElementById('npub') as HTMLElement).innerText = npub;
    });
}

export function showAppOrSettings() {
    chrome.storage.sync.get(['npub', 'relays'], ({npub, relays}) => {
        if (npub) {
            showApp();
        } else {
            showSettings();
        }
    });
}

document.getElementById('settings-save')!.addEventListener('click', () => {
    const npub = (document.getElementById('npubField') as HTMLInputElement).value;
    const relays = (document.getElementById('relays') as HTMLInputElement).value;

    chrome.storage.sync.set({npub, relays}, () => {
        window.location.reload();
        showApp();
    });
});

document.getElementById('openSettings')!.addEventListener('click', () => {
    showSettings();
});

document.getElementById('closeSettings')!.addEventListener('click', () => {
    showApp();
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['npub', 'relays'], ({npub, relays}) => {
        document.getElementById('npubField')!.value = npub||"";
        document.getElementById('relays')!.value = relays||(publishingRelays.join('\n'));
        document.getElementById('npub')!.innerText = npub;
    });
});