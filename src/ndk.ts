import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { NDKNip46Signer, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

const bunkerRelays = [ 'wss://relay.nsecbunker.com' ];
let bunkerNDK: NDK;

export let publishingRelays = [ 'wss://relay.snort.social', 'wss://relay.f7z.io', 'wss://relay.damus.io' ];
// export let publishingRelays = [ 'wss://relay.kind0.io' ];
export let publishingNDK: NDK;

chrome.storage.sync.get(['relays'], ({relays}) => {
    if (relays) {
        publishingRelays = relays.split(/(,|\n)+/).map((relay) => relay.trim()).filter((relay) => relay);

        publishingNDK = new NDK({ explicitRelayUrls: publishingRelays })
        publishingNDK.connect(2500);
    }
});

let localSigner: NDKPrivateKeySigner;

let settings = {
    npub: '',
    pk: ''
};

async function prepareNDK(ndk: NDK | undefined, relays: string[]): Promise<NDK> {
    if (!ndk || !ndk.signer?.user || ndk.pool.stats().connected === 0) {
        ndk = new NDK({ explicitRelayUrls: relays });
        await ndk.connect(2500);
    }

    return ndk;
}


export async function runWithNDK(cb?: (ndk: NDK) => void) {
    let signer: NDKPrivateKeySigner;

    // connect to relays from both ndk instances
    await Promise.all([
        (async () => { bunkerNDK = await prepareNDK(bunkerNDK, bunkerRelays) })(),
        (async () => { publishingNDK = await prepareNDK(publishingNDK, publishingRelays) })(),
    ]);

    // check if the publishing signer is present
    if (!publishingNDK.signer?.user) {
        // check if the bunker signer is present
        if (!bunkerNDK.signer?.user) {
            // get pk and npub
            chrome.storage.sync.get(['npub', 'pk', 'relays'], async ({npub, pk, relays}) => {
                settings.npub = npub;

                if (!pk) {
                    localSigner = NDKPrivateKeySigner.generate();

                    chrome.storage.sync.set({pk: localSigner.privateKey}, () => {
                        settings.pk = localSigner.privateKey!;
                    });
                } else {
                    console.log(`pk is present`, {pk});
                    localSigner = new NDKPrivateKeySigner(pk);
                }

                if (!npub) {
                    return;
                }

                if (relays) {
                    const relayArray = relays.split(/(,|\n)+/).map((relay: string) => relay.trim());

                    publishingNDK = await prepareNDK(undefined, relayArray);
                }

                publishingNDK.signer = new NDKNip46Signer(bunkerNDK, npub, localSigner);
                publishingNDK.signer.blockUntilReady().then(async (user) => {
                    console.log(`publishing signer is ready`, { user });
                    const remoteUser = await publishingNDK.signer?.user();

                    if (!remoteUser) {
                        console.log(`no remote user`);
                        return;
                    }

                    chrome.storage.sync.set({npub: remoteUser.npub}, () => {
                        settings.npub = remoteUser.npub;
                    });

                    if (cb) cb(publishingNDK);
                });
            });
        }
    } else {
        console.log(`publishing signer is already present`, !!cb);
        if (cb) cb(publishingNDK);
    }
}