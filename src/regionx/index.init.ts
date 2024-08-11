import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { force, keyring, log, submitExtrinsic } from "../utils";
import { KeyringPair } from "@polkadot/keyring/types";

const RELAY_ASSET_ID = 1;

export async function regionxInit(relayEndpoint: string, regionxEndpoint: string, regionxAccount: string) {
  const alice = keyring.addFromUri("//Alice");

  const regionxWsProvider = new WsProvider(regionxEndpoint);
  const regionxApi = await ApiPromise.create({ provider: regionxWsProvider });
  const relayWsProvider = new WsProvider(relayEndpoint);
  const relayApi = await ApiPromise.create({ provider: relayWsProvider });

  await setupRelayAsset(regionxApi);
  const giveRcTokensCall = regionxApi.tx.tokens.setBalance(alice.address, RELAY_ASSET_ID, 10n ** 18n, 0);
  await force(regionxApi, giveRcTokensCall);

  if (regionxAccount) {
    const giveBalanceCall = regionxApi.tx.balances.forceSetBalance(regionxAccount, 10n ** 18n);
    const giveRcTokensCall = regionxApi.tx.tokens.setBalance(regionxAccount, RELAY_ASSET_ID, 10n ** 18n, 0);
    await force(regionxApi, regionxApi.tx.utility.batch([giveBalanceCall, giveRcTokensCall]));
    await transferRelayTokensToRegionX(100n * 10n ** 12n, regionxAccount, relayApi, alice);
  }

  await ismpAddParachain(regionxApi);
}

async function ismpAddParachain(api: ApiPromise) {
  log("Adding coretime chain to ismp para list");
  const addParaCall = api.tx.ismpParachain.addParachain([1005]);
  return force(api, addParaCall);
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
async function transferRelayTokensToRegionX(
  amount: bigint,
  receiver: string,
  relayApi: ApiPromise,
  signer: KeyringPair
): Promise<void> {
  log("Teleporting relay tokens to RegionX");
  const receiverKeypair = new Keyring();
  receiverKeypair.addFromAddress(receiver);

  const feeAssetItem = 0;
  const weightLimit = "Unlimited";
  const reserveTransfer = relayApi.tx.xcmPallet.limitedReserveTransferAssets(
    { V3: { parents: 0, interior: { X1: { Parachain: 4479 } } } }, //dest
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

  return submitExtrinsic(signer, reserveTransfer, {});
}
