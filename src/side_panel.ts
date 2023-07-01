import NDK, { NDKEvent, NostrEvent } from '@nostr-dev-kit/ndk';
import { runWithNDK, publishingNDK } from './ndk';
import { showAppOrSettings } from './settings';
import { createHighlight } from './highlights/create';
import { addEventToList } from './lists/add';

let currentURL = '';
let currentTitle = '';
let currentHighlight: string | null = null;

// on document ready
document.addEventListener('DOMContentLoaded', () => {
    showAppOrSettings();

    // hide bookmark
    hideHighlight();

    // get current url
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        updateUrl({url: tabs[0].url, title: tabs[0].title});
    });

    runWithNDK();

    setTimeout(loadLists, 1000);
    setInterval(updateRelayStats, 1000);
});

function updateRelayStats() {
    const stats = publishingNDK.pool.stats();

    document.getElementById('totalConnected')!.innerHTML = JSON.stringify(stats);

    // console.log('stats', stats);
    // console.log('relays', Array.from(publishingNDK.pool.relays.values()).map((relay) => relay.url));

    document.getElementById('totalConnected')!.innerHTML = `Connected to ${stats.connected} relays`;
}

document.getElementById('save')!.addEventListener('click', () => {
    const comment = document.body.querySelector('#comment') as HTMLInputElement;
    const commentValue = comment.value.trim();
    const listValue = (document.body.querySelector('#lists') as HTMLInputElement).value;

    runWithNDK(async (ndk) => {
        if (currentHighlight) {
            const highlightEvent = await createHighlight(ndk, currentHighlight, currentURL, getTags());
            let eventToAddToList = highlightEvent;

            if (commentValue.length > 0) {
                const event = new NDKEvent(ndk, {
                    content: `nostr:${highlightEvent.encode()}\n` + commentValue,
                    kind: 1,
                    tags: [
                        ['q', highlightEvent.tagId(), 'quote'],
                        ['k', '9802']
                    ]
                } as NostrEvent);

                await event.sign();
                await event.publish();
                eventToAddToList = event;
            }

            if (listValue.length > 0) {
                addEventToList(ndk, listValue, eventToAddToList);
            }

        } else {
            if (!listValue || listValue.length === 0) {
                alert('Please select a list');
                return;
            }

            const user = await ndk.signer?.user();
            const content = [currentURL];

            if (currentTitle && currentTitle.length > 0) { content.push(currentTitle); }

            if (commentValue.length > 0) {
                content.push(commentValue);
            }
            debugger
            console.log('content', content);

            const event = new NDKEvent(ndk, {
                kind: 4,
                content: content.join('\n\n'),
            } as NostrEvent)

            event.tag(user);
            await event.encrypt(user);
            await event.publish();
            await addEventToList(ndk, listValue, event, true);

            comment.value = '';
        }
    });
});

chrome.runtime.onMessage.addListener(async ({ name, data }) => {
    loadLists();

    switch (name) {
        case 'new-highlight': {
            currentHighlight = data.value;
            if (!data) {
                hideHighlight();
            } else {
                showHighlight(data);
            }
            break;
        }

        case 'new-url': {
            showBookmark();
            updateUrl(data);
            break;
        }
    }
});

function getTags(): string[] {
    const tags = document.body.querySelector('#tags') as HTMLInputElement;
    return tags.value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
}

async function loadLists() {
    const listEl = document.body.querySelector('#lists');

    runWithNDK(async (ndk) => {
        const npubEl = document.body.querySelector('#npub');
        const user = await ndk.signer?.user();

        if (!user) {
            npubEl.innerText = 'no user';
            return;
        }

        npubEl.innerText = user?.npub || 'no npub';

        const sub = ndk.subscribe({
            kinds: [30001],
            authors: [ user.hexpubkey() ]
        });

        sub.on('event', (event) => {
            // only if the list is not already in the list
            const dTag = event.tagValue('d');
            if (!dTag) { return; }

            if (listEl.querySelector(`option[value="${dTag}"]`)) return;

            const option = document.createElement('option');
            option.innerText = event.tagValue('name') ?? dTag;
            option.value = dTag;
            listEl.appendChild(option);
        });
    });
}

function showBookmark() {
    document.body.querySelector('#bookmark-container').style.display = 'flex';
    hideHighlight();
}

function hideBookmark() {
    document.body.querySelector('#bookmark-container').style.display = 'none';
}

function hideHighlight() {
    document.body.querySelector('#highlight-container').style.display = 'none';
}

function showHighlight({value}: {value: string}) {
    document.body.querySelector('#highlight-container').style.display = 'flex';
    document.body.querySelector('#highlight').innerText = value;
    hideBookmark();
}

function updateUrl({url, title}: {url: string, title: string}) {
    currentURL = url;
    currentTitle = title;
    document.body.querySelector('#url1').innerText = url;
    document.body.querySelector('#url2').innerText = url;
}

