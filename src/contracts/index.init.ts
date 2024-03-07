import { ApiPromise, WsProvider } from "@polkadot/api";
import Keyring from "@polkadot/keyring";
import { CoreMask, Id, Region } from "coretime-utils";
import { log, setBalance } from "../utils";
import { deployMarket, deployXcRegions, initXcRegion, transferWrappedRegion } from "./contract";
import { approveTransfer, createRegionCollection, mintRegion, registerXcRegionAsset } from "./uniques";
import * as consts from "../consts";

const keyring = new Keyring({ type: "sr25519" });

export async function contractsInit(contractsEndpoint: string, account: string, contractsPath: string, mint: boolean) {
  const alice = keyring.addFromUri("//Alice");

  const contractsProvider = new WsProvider(contractsEndpoint);
  const contractsApi = await ApiPromise.create({ provider: contractsProvider, types: { Id } });

  const xcRegionsAddress = await deployXcRegions(contractsApi, contractsPath);
  log(`XcRegions address: ${xcRegionsAddress}`);

  const marketAddress = await deployMarket(contractsApi, xcRegionsAddress, contractsPath);
  log(`Market address: ${marketAddress}`);

  await createRegionCollection(contractsApi);
  await registerXcRegionAsset(contractsApi);

  if (account) {
    await setBalance(contractsApi, account, (10 ** 8 * consts.UNIT).toString());
  }

  if (mint) {
    const mockRegions = [
      new Region(
        { begin: 30, core: 0, mask: CoreMask.fromChunk(0, 40) },
        { end: 60, owner: alice.address, paid: null }
      ),
      new Region({ begin: 5, core: 1, mask: CoreMask.completeMask() }, { end: 30, owner: alice.address, paid: null }),
      new Region(
        { begin: 5, core: 2, mask: CoreMask.fromChunk(40, 60) },
        { end: 30, owner: alice.address, paid: null }
      ),
    ];

    for await (const mockRegion of mockRegions) {
      await mintRegion(contractsApi, mockRegion);
      await approveTransfer(contractsApi, mockRegion, xcRegionsAddress);
      await initXcRegion(contractsApi, xcRegionsAddress, mockRegion, contractsPath);
      if (account) {
        await transferWrappedRegion(contractsApi, xcRegionsAddress, mockRegion, account, contractsPath);
      }
    }
  }
}
