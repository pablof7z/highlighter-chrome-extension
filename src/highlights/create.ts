import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";

export async function createHighlight(ndk: NDK, highlight: string, url: string, tags?: string[]) {
    const event = new NDKEvent(ndk, {
        kind: 9802,
        content: highlight,
    } as NostrEvent);

    if (url) {
        event.tags.push(['r', url]);
    }

    if (tags) {
        event.tags.push(...tags.map((tag) => ['t', tag]));
    }

    console.log('created', await event.toNostrEvent());

    await event.sign();
    await event.publish();

    return event;
}
