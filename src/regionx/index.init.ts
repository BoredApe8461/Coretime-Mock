import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { force, keyring, log } from "../utils";
import { KeyringPair } from "@polkadot/keyring/types";

const RELAY_ASSET_ID = 1;

export async function regionxInit(relayEndpoint: string, regionxEndpoint: string, regionxAccount: string) {
  const alice = keyring.addFromUri("//Alice");

  const regionxWsProvider = new WsProvider(regionxEndpoint);
  const regionxApi = await ApiPromise.create({ provider: regionxWsProvider });
  const relayWsProvider = new WsProvider(relayEndpoint);
  const relayApi = await ApiPromise.create({ provider: relayWsProvider });

  await setupRelayAsset(regionxApi);

  if (regionxAccount) {
    await transferRelayTokensToRegionX(10n ** 12n, relayApi, alice);
  }
}

async function setupRelayAsset(api: ApiPromise) {
  log("Settting up relay token on RegionX");
  const assetMetadata = {
    decimals: 12,
    name: "ROC",
    symbol: "ROC",
    existentialDeposit: 10n ** 3n,
    location: null,
    additional: null,
  };

  const assetSetupCalls = [
    api.tx.assetRegistry.registerAsset(assetMetadata, RELAY_ASSET_ID),
    api.tx.assetRate.create(RELAY_ASSET_ID, 1_000_000_000_000_000_000n), // 1 on 1
  ];

  const batchCall = api.tx.utility.batch(assetSetupCalls);
  return force(api, batchCall);
}
async function transferRelayTokensToRegionX(amount: bigint, relayApi: ApiPromise, signer: KeyringPair): Promise<void> {
  log("Teleporting relay tokens to RegionX");
  const receiverKeypair = new Keyring();
  receiverKeypair.addFromAddress(signer.address);

  const feeAssetItem = 0;
  const weightLimit = "Unlimited";
  const reserveTransfer = relayApi.tx.xcmPallet.limitedReserveTransferAssets(
    { V3: { parents: 0, interior: { X1: { Parachain: 2000 } } } }, //dest
    {
      V3: {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              chain: "Any",
              id: receiverKeypair.pairs[0].publicKey,
            },
          },
        },
      },
    }, //beneficiary
    {
      V3: [
        {
          id: {
            Concrete: { parents: 0, interior: "Here" },
          },
          fun: {
            Fungible: amount,
          },
        },
      ],
    }, //asset
    feeAssetItem,
    weightLimit
  );

  const callTx = async (resolve: () => void) => {
    const unsub = await reserveTransfer.signAndSend(signer, async (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}
