import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import * as consts from "./consts";
import { CoreMask, RegionId } from "coretime-utils";

export async function purchaseRegion(coretimeApi: ApiPromise, buyer: KeyringPair): Promise<RegionId> {
  log(`Purchasing a reigon.`);

  const callTx = async (resolve: (regionId: RegionId) => void) => {
    const purchase = coretimeApi.tx.broker.purchase(consts.INITIAL_PRICE * 2);
    const unsub = await purchase.signAndSend(buyer, async (result: any) => {
      if (result.status.isInBlock) {
        const regionId = await getRegionId(coretimeApi);
        unsub();
        resolve(regionId);
      }
    });
  };

  return new Promise(callTx);
}

export async function transferRegion(
  coretimeApi: ApiPromise,
  sender: KeyringPair,
  receiver: string,
  regionId: RegionId
): Promise<void> {
  log(`Transferring a reigon to ${receiver}`);

  const callTx = async (resolve: () => void) => {
    const transfer = coretimeApi.tx.broker.transfer(regionId, receiver);
    const unsub = await transfer.signAndSend(sender, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

async function getRegionId(coretimeApi: ApiPromise): Promise<RegionId> {
  log("Getting contract address");
  const events: any = await coretimeApi.query.system.events();

  for (const record of events) {
    const { event } = record;
    if (event.section === "broker" && event.method === "Purchased") {
      log("Found RegionId: " + event.data[1].toString());
      return event.data[1];
    }
  }

  return { begin: 0, core: 0, mask: CoreMask.voidMask() };
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
