import { ApiPromise } from "@polkadot/api";
import { keyring, log } from "../utils";
import {
  getContractAddress,
  getMarketMetadata,
  getMarketWasm,
  getMaxGasLimit,
  getXcRegionsMetadata,
  getXcRegionsWasm,
} from "./utils";
import { Abi, ContractPromise } from "@polkadot/api-contract";
import { Region } from "coretime-utils";
import { u8aToHex } from "@polkadot/util";
import type { WeightV2 } from "@polkadot/types/interfaces";
import { BN, bnToBn } from "@polkadot/util";

export async function deployXcRegions(contractsApi: ApiPromise, contractsPath: string): Promise<string> {
  log(`Uploading xcRegions contract code`);

  const wasm = getXcRegionsWasm(contractsPath);
  const metadata = getXcRegionsMetadata(contractsApi, contractsPath);

  return Promise.resolve(instantiateWithCode(contractsApi, wasm, metadata, []));
}

export async function deployMarket(
  contractsApi: ApiPromise,
  xcRegionsContract: string,
  contractsPath: string
): Promise<string> {
  log(`Uploading market contract code`);

  const wasm = getMarketWasm(contractsPath);
  const metadata = getMarketMetadata(contractsApi, contractsPath);
  const listingDeposit = 0;
  const timeslicePeriod = 80;

  return Promise.resolve(
    instantiateWithCode(contractsApi, wasm, metadata, [xcRegionsContract, listingDeposit, timeslicePeriod])
  );
}

export async function instantiateWithCode(
  contractsApi: ApiPromise,
  wasm: Buffer,
  metadata: Abi,
  params: any[]
): Promise<string> {
  const alice = keyring.addFromUri("//Alice");

  const value = 0;
  const storageDepositLimit = null;

  const instantiate = contractsApi.tx.contracts.instantiateWithCode(
    value,
    getMaxGasLimit(),
    storageDepositLimit,
    u8aToHex(wasm),
    metadata.findConstructor(0).toU8a(params),
    null
  );

  const callTx = async (resolve: (address: string) => void) => {
    const unsub = await instantiate.signAndSend(alice, async (result: any) => {
      if (result.status.isInBlock) {
        const address = await getContractAddress(contractsApi);
        unsub();
        resolve(address);
      }
    });
  };

  return new Promise(callTx);
}

export async function initXcRegion(
  contractsApi: ApiPromise,
  contractAddress: string,
  region: Region,
  contractsPath: string
): Promise<void> {
  log(`Initializing the metadata for a xc-region`);

  const metadata = getXcRegionsMetadata(contractsApi, contractsPath);
  const xcRegionsContract = new ContractPromise(contractsApi, metadata, contractAddress);

  const rawRegionId = region.getEncodedRegionId(contractsApi);
  const id = contractsApi.createType("Id", { U128: rawRegionId });

  const alice = keyring.addFromUri("//Alice");

  const callArguments = [
    id,
    // All the region metadata combined:
    {
      begin: region.getBegin(),
      end: region.getEnd(),
      core: region.getCore(),
      mask: region.getMask().getMask(),
    },
  ];

  const initCall = xcRegionsContract.tx["regionMetadata::init"](
    { gasLimit: getGasLimit(contractsApi, "8000000000", "250000"), storageDepositLimit: null },
    ...callArguments
  );

  const callTx = async (resolve: () => void) => {
    const unsub = await initCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

export async function transferWrappedRegion(
  contractsApi: ApiPromise,
  contractAddress: string,
  region: Region,
  receiver: string,
  contractsPath: string
): Promise<void> {
  log(`Transferring wrapped region to ${receiver}`);

  const metadata = getXcRegionsMetadata(contractsApi, contractsPath);
  const xcRegionsContract = new ContractPromise(contractsApi, metadata, contractAddress);

  const rawRegionId = region.getEncodedRegionId(contractsApi);

  const alice = keyring.addFromUri("//Alice");

  const id = contractsApi.createType("Id", { U128: rawRegionId });
  const callArguments = [receiver, id, []];

  const transferCall = xcRegionsContract.tx["psp34::transfer"](
    { gasLimit: getGasLimit(contractsApi, "8000000000", "250000"), storageDepositLimit: null },
    ...callArguments
  );

  const callTx = async (resolve: () => void) => {
    const unsub = await transferCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

export const getGasLimit = (api: ApiPromise, _refTime: string | BN, _proofSize: string | BN): WeightV2 => {
  const refTime = bnToBn(_refTime);
  const proofSize = bnToBn(_proofSize);

  return api.registry.createType("WeightV2", {
    refTime,
    proofSize,
  }) as WeightV2;
};
