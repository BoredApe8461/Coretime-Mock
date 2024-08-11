import { cryptoWaitReady } from "@polkadot/util-crypto";
import { program } from "commander";
import process from "process";
import { relayInit } from "./relay/index.init";
import { coretimeInit } from "./coretime/index.init";
import { regionxInit } from "./regionx/index.init";

program
  .option("--relayInit")
  .option("--coretimeInit")
  .option("--regionxInit")
  .option("--coretimeAccount <string>")
  .option("--regionxAccount <string>");

program.parse(process.argv);

const CORETIME_PARA_ID = 1005;
const CONTRACTS_PARA_ID = 4479;

const ROCOCO_ENDPOINT = "ws://127.0.0.1:9900";
const CORETIME_ENDPOINT = "ws://127.0.0.1:9910";
const REGIONX_ENDPOINT = "ws://127.0.0.1:9920";

async function init() {
  await cryptoWaitReady();

  if (program.opts().relayInit) {
    await relayInit(ROCOCO_ENDPOINT, CORETIME_PARA_ID, CONTRACTS_PARA_ID);
  }

  if (program.opts().coretimeInit) {
    await coretimeInit(CORETIME_ENDPOINT, program.opts().coretimeAccount || "");
  }

  if (program.opts().regionxInit) {
    await regionxInit(ROCOCO_ENDPOINT, REGIONX_ENDPOINT, program.opts().regionxAccount || "");
  }
}

init().then(() => process.exit(0));
