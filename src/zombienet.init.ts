import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { purchaseRegion, log, normalizePath, transferRegion } from "./common";
import { Abi, ContractPromise } from "@polkadot/api-contract";
import { program } from "commander";
import fs from "fs";
import * as consts from "./consts";
import { CoreMask, Id, Region } from "coretime-utils";
import process from "process";
import type { WeightV2 } from "@polkadot/types/interfaces";
import { BN, bnToBn } from "@polkadot/util";

program
  .option("--fullNetwork")
  .option("--contracts <string>")
  .option("--contractsAccount <string>")
  .option("--coretimeAccount <string>");

program.parse(process.argv);

const REGION_COLLECTION_ID = 42;

const CORETIME_CHAIN_PARA_ID = 1005;
const CONTRACTS_CHAIN_PARA_ID = 2000;

const ROCOCO_ENDPOINT = "ws://127.0.0.1:9900";
const CORETIME_ENDPOINT = "ws://127.0.0.1:9910";
const CONTRACTS_ENDPOINT = "ws://127.0.0.1:9920";

const keyring = new Keyring({ type: "sr25519" });

async function init() {
  const rococoWsProvider = new WsProvider(ROCOCO_ENDPOINT);
  const coretimeWsProvider = new WsProvider(CORETIME_ENDPOINT);

  const coretimeApi = await ApiPromise.create({ provider: coretimeWsProvider });
  const rococoApi = await ApiPromise.create({ provider: rococoWsProvider });

  await cryptoWaitReady();
  const alice = keyring.addFromUri("//Alice");

  await configureBroker(rococoApi, coretimeApi);
  await startSales(rococoApi, coretimeApi);

  await setBalance(rococoApi, coretimeApi, alice.address, 1000 * consts.UNIT);

  // Takes some time to get everything ready before being able to perform a purchase.
  await sleep(60000);
  const regionId = await purchaseRegion(coretimeApi, alice);

  const coretimeAccount = program.opts().coretimeAccount;
  if (coretimeAccount) {
    await transferRegion(coretimeApi, alice, coretimeAccount, regionId);
  }

  if (program.opts().fullNetwork) {
    const account = program.opts().contractsAccount;

    await openHrmpChannel(rococoApi, CORETIME_CHAIN_PARA_ID, CONTRACTS_CHAIN_PARA_ID);

    const contractsProvider = new WsProvider(CONTRACTS_ENDPOINT);
    const contractsApi = await ApiPromise.create({ provider: contractsProvider, types: { Id } });

    const xcRegionsAddress = await deployXcRegionsCode(contractsApi);
    await createRegionCollection(contractsApi);

    const mockRegion = new Region(
      { begin: 30, core: 0, mask: CoreMask.fromChunk(0, 40) },
      { end: 60, owner: alice.address, paid: null }
    );

    await mintRegion(contractsApi, mockRegion);
    await approveTransfer(contractsApi, mockRegion, xcRegionsAddress);
    await initXcRegion(contractsApi, xcRegionsAddress, mockRegion);
    if (account) {
      await transferWrappedRegion(contractsApi, xcRegionsAddress, mockRegion, account);
    }
  }
}

init().then(() => process.exit(0));

async function configureBroker(rococoApi: ApiPromise, coretimeApi: ApiPromise): Promise<void> {
  log(`Setting the initial configuration for the broker pallet`);

  const configCall = u8aToHex(coretimeApi.tx.broker.configure(consts.CONFIG).method.toU8a());
  return forceSendXcmCall(rococoApi, CORETIME_CHAIN_PARA_ID, configCall);
}

async function startSales(rococoApi: ApiPromise, coretimeApi: ApiPromise): Promise<void> {
  log(`Starting the bulk sale`);

  const startSaleCall = u8aToHex(
    coretimeApi.tx.broker.startSales(consts.INITIAL_PRICE, consts.CORE_COUNT).method.toU8a()
  );
  return forceSendXcmCall(rococoApi, CORETIME_CHAIN_PARA_ID, startSaleCall);
}

async function setBalance(rococoApi: ApiPromise, coretimeApi: ApiPromise, who: string, balance: number) {
  log(`Setting balance of ${who} to ${balance}`);

  const setBalanceCall = u8aToHex(coretimeApi.tx.balances.forceSetBalance(who, balance).method.toU8a());
  return forceSendXcmCall(rococoApi, CORETIME_CHAIN_PARA_ID, setBalanceCall);
}

async function openHrmpChannel(rococoApi: ApiPromise, sender: number, recipient: number): Promise<void> {
  log(`Openeing HRMP channel between ${sender} - ${recipient}`);

  const newHrmpChannel = [
    sender,
    recipient,
    8, // Max capacity
    512, // Max message size
  ];

  const alice = keyring.addFromUri("//Alice");

  const openHrmp = rococoApi.tx.hrmp.forceOpenHrmpChannel(...newHrmpChannel);
  const sudoCall = rococoApi.tx.sudo.sudo(openHrmp);

  const callTx = async (resolve: () => void) => {
    const unsub = await sudoCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

async function deployXcRegionsCode(contractsApi: ApiPromise): Promise<string> {
  log(`Uploading xcRegions contract code`);
  const alice = keyring.addFromUri("//Alice");

  const contractsPath = normalizePath(program.opts().contracts);

  const value = 0;
  const storageDepositLimit = null;
  const wasm = getXcRegionsWasm(contractsPath);
  const metadata = getXcRegionsMetadata(contractsApi, contractsPath);

  const instantiate = contractsApi.tx.contracts.instantiateWithCode(
    value,
    getMaxGasLimit(),
    storageDepositLimit,
    u8aToHex(wasm),
    metadata.findConstructor(0).toU8a([]),
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

// Create a mock collection that will represent regions.
async function createRegionCollection(contractsApi: ApiPromise): Promise<void> {
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

async function mintRegion(contractsApi: ApiPromise, region: Region): Promise<void> {
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

async function approveTransfer(contractsApi: ApiPromise, region: Region, delegate: string): Promise<void> {
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

async function initXcRegion(contractsApi: ApiPromise, contractAddress: string, region: Region): Promise<void> {
  log(`Initializing the metadata for a xc-region`);

  const contractsPath = normalizePath(program.opts().contracts);

  const metadata = getXcRegionsMetadata(contractsApi, contractsPath);
  const xcRegionsContract = new ContractPromise(contractsApi, metadata, contractAddress);

  const rawRegionId = region.getEncodedRegionId(contractsApi);

  const alice = keyring.addFromUri("//Alice");

  const callArguments = [
    rawRegionId,
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

async function transferWrappedRegion(
  contractsApi: ApiPromise,
  contractAddress: string,
  region: Region,
  receiver: string
): Promise<void> {
  log(`Transferring wrapped region to ${receiver}`);

  const contractsPath = normalizePath(program.opts().contracts);

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

async function forceSendXcmCall(api: ApiPromise, destParaId: number, encodedCall: string): Promise<void> {
  const xcmCall = api.tx.xcmPallet.send(parachainMultiLocation(destParaId), {
    V3: [
      {
        UnpaidExecution: {
          check_origin: null,
          weight_limit: "Unlimited",
        },
      },
      {
        Transact: {
          originKind: "Superuser",
          requireWeightAtMost: getMaxGasLimit(),
          call: {
            encoded: encodedCall,
          },
        },
      },
    ],
  });

  const sudoCall = api.tx.sudo.sudo(xcmCall);

  const alice = keyring.addFromUri("//Alice");

  const callTx = async (resolve: () => void) => {
    const unsub = await sudoCall.signAndSend(alice, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}

async function getContractAddress(contractsApi: ApiPromise): Promise<string> {
  log("Getting contract address");
  const events: any = await contractsApi.query.system.events();

  for (const record of events) {
    const { event } = record;
    if (event.section === "contracts" && event.method === "Instantiated") {
      log("Found contract address: " + event.data[1].toString());
      return event.data[1].toString();
    }
  }

  return "";
}

function parachainMultiLocation(paraId: number): any {
  return {
    V3: {
      parents: 0,
      interior: {
        X1: {
          Parachain: paraId,
        },
      },
    },
  };
}

const getMaxGasLimit = () => {
  return {
    refTime: 5000000000,
    proofSize: 900000,
  };
};

export const getGasLimit = (api: ApiPromise, _refTime: string | BN, _proofSize: string | BN): WeightV2 => {
  const refTime = bnToBn(_refTime);
  const proofSize = bnToBn(_proofSize);

  return api.registry.createType("WeightV2", {
    refTime,
    proofSize,
  }) as WeightV2;
};

const getXcRegionsMetadata = (contractsApi: ApiPromise, contractsPath: string) =>
  new Abi(
    fs.readFileSync(`${contractsPath}/xc_regions/xc_regions.json`, "utf-8"),
    contractsApi.registry.getChainProperties()
  );

const getXcRegionsWasm = (contractsPath: string) => fs.readFileSync(`${contractsPath}/xc_regions/xc_regions.wasm`);

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
