import { ApiPromise } from "@polkadot/api";
import { force, log } from "../utils";
import { keyring } from "../utils";
import { Region } from "coretime-utils";

const REGION_COLLECTION_ID = 42;

// Create a mock collection that will represent regions.
export async function createRegionCollection(contractsApi: ApiPromise): Promise<void> {
  log(`Creating the region collection`);

  const alice = keyring.addFromUri("//Alice");
  const createCollectionCall = contractsApi.tx.uniques.create(REGION_COLLECTION_ID, alice.address);

  const callTx = async (resolve: () => void) => {
    const unsub = await createCollectionCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

export async function registerXcRegionAsset(contractsApi: ApiPromise): Promise<void> {
  log(`Registering xc-region asset`);

  const registerCall = contractsApi.tx.xcAssetConfig.registerAssetLocation(
    {
      V3: {
        parents: 1,
        interior: {
          X2: [{ Parachain: 1005 }, { PalletInstance: 50 }],
        },
      },
    },
    REGION_COLLECTION_ID
  );

  return force(contractsApi, registerCall);
}

export async function mintRegion(contractsApi: ApiPromise, region: Region): Promise<void> {
  log(`Minting a region`);

  const alice = keyring.addFromUri("//Alice");
  const rawRegionId = region.getEncodedRegionId(contractsApi);
  const mintCall = contractsApi.tx.uniques.mint(REGION_COLLECTION_ID, rawRegionId, alice.address);

  const callTx = async (resolve: () => void) => {
    const unsub = await mintCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

export async function approveTransfer(contractsApi: ApiPromise, region: Region, delegate: string): Promise<void> {
  log(`Approving region to ${delegate}`);

  const alice = keyring.addFromUri("//Alice");
  const rawRegionId = region.getEncodedRegionId(contractsApi);
  const approveCall = contractsApi.tx.uniques.approveTransfer(REGION_COLLECTION_ID, rawRegionId, delegate);

  const callTx = async (resolve: () => void) => {
    const unsub = await approveCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}
