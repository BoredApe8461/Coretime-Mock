import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { Timeslice } from "./types";
import * as consts from "./consts";

const keyring = new Keyring({ type: "sr25519" });

async function init() {
  const coretimeWsProvider = new WsProvider("ws://127.0.0.1:8000");
  const rococoWsProvider = new WsProvider("wss://rococo-rpc.polkadot.io/");

  const coretimeApi = await ApiPromise.create({ provider: coretimeWsProvider });
  const rococoApi = await ApiPromise.create({ provider: rococoWsProvider });

  await startBulkSale(rococoApi, coretimeApi);
}

init().then(() => process.exit(0));

async function startBulkSale(rococoApi: ApiPromise, coretimeApi: ApiPromise) {
  const latestRcBlock = (
    await rococoApi.rpc.chain.getHeader()
  ).number.toNumber();
  await setStatus(coretimeApi, latestRcBlock);
  console.log("status set");
  await initializeSale(coretimeApi, latestRcBlock);
  console.log("sale initialized");

  const alice = keyring.addFromUri("//Alice");
  await cryptoWaitReady();

  console.log(alice.address);
  // Alice buys a region.
  await purchaseRegion(coretimeApi, alice);
  console.log("Region purchased");
}

async function purchaseRegion(
  coretimeApi: ApiPromise,
  buyer: KeyringPair,
): Promise<void> {
  const callTx = async (resolve: () => void) => {
    const purchase = coretimeApi.tx.broker.purchase(consts.INITIAL_PRICE * 2);
    console.log(purchase.data);
    const unsub = await purchase.signAndSend(buyer, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

async function setStatus(
  coretimeApi: ApiPromise,
  latestRcBlock: number,
): Promise<any> {
  const commitTimeslice = getLatestTimesliceReadyToCommit(latestRcBlock);

  const status = {
    core_count: consts.CORE_COUNT,
    private_pool_size: 0,
    system_pool_size: 0,
    last_committed_timeslice: currentTimeslice(commitTimeslice) - 1,
    last_timeslice: currentTimeslice(latestRcBlock),
  };

  await coretimeApi.rpc("dev_setStorage", {
    broker: {
      status,
    },
  });
  return await coretimeApi.rpc("dev_newBlock");
}

async function initializeSale(
  coretimeApi: ApiPromise,
  latestRcBlock: number,
): Promise<any> {
  const now = (await coretimeApi.rpc.chain.getHeader()).number.toNumber();
  const commitTimeslice = getLatestTimesliceReadyToCommit(latestRcBlock);

  const saleInfo = {
    sale_start: now,
    leadin_length: consts.CONFIG.leadin_length,
    price: consts.INITIAL_PRICE,
    sellout_price: null,
    region_begin: commitTimeslice,
    region_end: commitTimeslice + consts.CONFIG.region_length,
    first_core: 0,
    ideal_cores_sold: consts.IDEAL_CORES_SOLD,
    cores_offered: consts.CORE_COUNT,
    cores_sold: 0,
  };

  return await coretimeApi.rpc("dev_setStorage", {
    broker: {
      saleInfo,
    },
  });
}

function currentTimeslice(latestRcBlock: number) {
  return Math.floor(latestRcBlock / consts.TIMESLICE_PERIOD);
}

function getLatestTimesliceReadyToCommit(latestRcBlock: number): Timeslice {
  let advanced = latestRcBlock + consts.CONFIG.advance_notice;
  return Math.floor(advanced / consts.TIMESLICE_PERIOD);
}
