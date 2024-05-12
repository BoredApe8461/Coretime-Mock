import { ApiPromise, WsProvider } from "@polkadot/api";
import { force, log, setBalance } from "../utils";
import * as consts from "../consts";

export async function coretimeInit(coretimeEndpoint: string, coretimeAccount: string) {
  const coretimeWsProvider = new WsProvider(coretimeEndpoint);
  const coretimeApi = await ApiPromise.create({ provider: coretimeWsProvider });

  await forceSafeXCMVersion(coretimeApi);
  await configureBroker(coretimeApi);
  await startSales(coretimeApi);

  if (coretimeAccount) {
    await setBalance(coretimeApi, coretimeAccount, (1000 * consts.UNIT).toString());
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

async function forceSafeXCMVersion(coretimeApi: ApiPromise): Promise<void> {
  log(`Setting the safe XCM version to V3`);

  const setVersionCall = coretimeApi.tx.polkadotXcm.forceDefaultXcmVersion([3]);
  return force(coretimeApi, setVersionCall);
}
