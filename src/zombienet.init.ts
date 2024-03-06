import { cryptoWaitReady } from "@polkadot/util-crypto";
import { program } from "commander";
import process from "process";
import { relayInit } from "./relay/index.init";
import { coretimeInit } from "./coretime/index.init";
import { contractsInit } from "./contracts/index.init";
import { normalizePath } from "./utils";

program
  .option("--relayInit")
  .option("--coretimeInit")
  .option("--contractsInit")
  .option("--contractsPath <string>")
  .option("--contractsAccount <string>")
  .option("--coretimeAccount <string>")
  .option("--mintXcRegions");

program.parse(process.argv);

const CORETIME_PARA_ID = 1005;
const CONTRACTS_PARA_ID = 2000;

const ROCOCO_ENDPOINT = "ws://127.0.0.1:9900";
const CORETIME_ENDPOINT = "ws://127.0.0.1:9910";
const CONTRACTS_ENDPOINT = "ws://127.0.0.1:9920";

async function init() {
  await cryptoWaitReady();

  if (program.opts().relayInit) {
    await relayInit(ROCOCO_ENDPOINT, CORETIME_PARA_ID, CONTRACTS_PARA_ID);
  }

  if (program.opts().coretimeInit) {
    await coretimeInit(CORETIME_ENDPOINT, program.opts().coretimeAccount || "");
  }

  if (program.opts().contractsInit) {
    if (!program.opts().contractsPath) {
      throw new Error("--contractsPath must be specified");
    }
    const contractsPath = normalizePath(program.opts().contractsPath);
    await contractsInit(
      CONTRACTS_ENDPOINT,
      program.opts().contractsAccount || "",
      contractsPath,
      program.opts().mintXcRegions
    );
  }
}

init().then(() => process.exit(0));
