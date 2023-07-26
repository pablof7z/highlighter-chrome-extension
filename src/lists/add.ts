import NDK, { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";

export async function addEventToList(ndk: NDK, dTag: string, event: NDKEvent, encrypted = false) {
    const user = await ndk.signer?.user();

    if (!user) {
        throw new Error('User not found');
    }

    const fetchEventId = {
        kinds: [30001],
        '#d': [dTag],
        authors: [user.hexpubkey()],
    }
    const listEvent = await ndk.fetchEvent( fetchEventId as unknown as string);

    if (listEvent) {
        listEvent.created_at = Math.floor(Date.now() / 1000);

        if (encrypted) {
            let encryptedTags: NDKTag[] = [];
            if (listEvent.content.length > 0) {
                await listEvent.decrypt(user);
                console.log('decrypted', listEvent.content);
                encryptedTags = JSON.parse(listEvent.content) as NDKTag[];
            }

            encryptedTags.push(event.tagReference());
            listEvent.content = JSON.stringify(encryptedTags);

            await listEvent.encrypt(user);

            console.log('encrypted', listEvent.rawEvent());
        } else {
            listEvent.tag(event);
        }

        await listEvent.sign();
        await listEvent.publish();
    }
}