import { ApiPromise, WsProvider } from "@polkadot/api";
import { force, keyring, log, setBalance } from "../utils";
import { KeyringPair } from "@polkadot/keyring/types";
import { CoreMask, RegionId } from "coretime-utils";
import * as consts from "../consts";

export async function coretimeInit(coretimeEndpoint: string, coretimeAccount: string) {
  const alice = keyring.addFromUri("//Alice");

  const coretimeWsProvider = new WsProvider(coretimeEndpoint);
  const coretimeApi = await ApiPromise.create({ provider: coretimeWsProvider });

  await configureBroker(coretimeApi);
  await startSales(coretimeApi);

  await setBalance(coretimeApi, alice.address, (1000 * consts.UNIT).toString());

  const regionId = await purchaseRegion(coretimeApi, alice);

  if (coretimeAccount) {
    await transferRegion(coretimeApi, alice, coretimeAccount, regionId);
  }
}

async function configureBroker(coretimeApi: ApiPromise): Promise<void> {
  log(`Setting the initial configuration for the broker pallet`);

  const configCall = coretimeApi.tx.broker.configure(consts.CONFIG);
  return force(coretimeApi, configCall);
}

async function startSales(coretimeApi: ApiPromise): Promise<void> {
  log(`Starting the bulk sale`);

  const startSaleCall = coretimeApi.tx.broker.startSales(consts.INITIAL_PRICE, consts.CORE_COUNT);
  return force(coretimeApi, startSaleCall);
}

export async function purchaseRegion(coretimeApi: ApiPromise, buyer: KeyringPair): Promise<RegionId> {
  log(`Purchasing a region.`);

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
  log(`Transferring a region to ${receiver}`);

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
  log("Getting regionId");
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
