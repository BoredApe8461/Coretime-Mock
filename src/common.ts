import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import BN from "bn.js";
import * as consts from "./consts";
import { RegionId } from "./types";

export async function purchaseRegion(coretimeApi: ApiPromise, buyer: KeyringPair): Promise<void> {
  log(`Purchasing a reigon.`);

  const callTx = async (resolve: () => void) => {
    const purchase = coretimeApi.tx.broker.purchase(consts.INITIAL_PRICE * 2);
    const unsub = await purchase.signAndSend(buyer, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

export function log(message: string) {
  // Green log.
  console.log("\x1b[32m%s\x1b[0m", message);
}

export function normalizePath(path: string) {
  if (path.endsWith("/") && path.length > 1) {
    return path.slice(0, -1);
  }
  return path;
}

export function encodeRegionId(contractsApi: ApiPromise, regionId: RegionId): BN {
  const encodedBegin = contractsApi.createType("u32", regionId.begin).toHex().substring(2);
  const encodedCore = contractsApi.createType("u16", regionId.core).toHex().substring(2);

  const rawRegionId = encodedBegin + encodedCore + regionId.mask.substring(2);

  return new BN(rawRegionId, 16);
}
