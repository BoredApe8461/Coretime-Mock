import { ApiPromise } from "@polkadot/api";
import fs from "fs";
import { Abi } from "@polkadot/api-contract";
import { log } from "../utils";

export async function getContractAddress(contractsApi: ApiPromise): Promise<string> {
  log("Getting contract address");
  const events: any = await contractsApi.query.system.events();

  for (const record of events) {
    const { event } = record;
    if (event.section === "contracts" && event.method === "Instantiated") {
      return event.data[1].toString();
    }
  }

  return "";
}

export const getXcRegionsMetadata = (contractsApi: ApiPromise, contractsPath: string) =>
  new Abi(
    fs.readFileSync(`${contractsPath}/xc_regions/xc_regions.json`, "utf-8"),
    contractsApi.registry.getChainProperties()
  );

export const getMarketMetadata = (contractsApi: ApiPromise, contractsPath: string) =>
  new Abi(
    fs.readFileSync(`${contractsPath}/coretime_market/coretime_market.json`, "utf-8"),
    contractsApi.registry.getChainProperties()
  );

export const getXcRegionsWasm = (contractsPath: string) =>
  fs.readFileSync(`${contractsPath}/xc_regions/xc_regions.wasm`);

export const getMarketWasm = (contractsPath: string) =>
  fs.readFileSync(`${contractsPath}/coretime_market/coretime_market.wasm`);

export const getMaxGasLimit = () => {
  return {
    refTime: 5000000000,
    proofSize: 900000,
  };
};
