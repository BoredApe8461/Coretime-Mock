import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { purchaseRegion } from "./common";
import * as consts from "./consts";
import process from "process";

const FULL_NETWORK = "fullNetwork";

const CORETIME_CHAIN_PARA_ID = 1005;
const CONTRACTS_CHAIN_PARA_ID = 2000;

const keyring = new Keyring({ type: "sr25519" });

async function init() {
  const rococoWsProvider = new WsProvider("ws://127.0.0.1:9900");
  const coretimeWsProvider = new WsProvider("ws://127.0.0.1:9910");

  const coretimeApi = await ApiPromise.create({ provider: coretimeWsProvider });
  const rococoApi = await ApiPromise.create({ provider: rococoWsProvider });

  await cryptoWaitReady();

  if (featureFlag(FULL_NETWORK)) {
    await openHrmpChannel(
      rococoApi,
      CORETIME_CHAIN_PARA_ID,
      CONTRACTS_CHAIN_PARA_ID,
    );
  }

  await configureBroker(rococoApi, coretimeApi);
  await startSales(rococoApi, coretimeApi);

  const alice = keyring.addFromUri("//Alice");
  await setBalance(rococoApi, coretimeApi, alice.address, 1000 * consts.UNIT);

  // Takes some time to get everything ready before being able to perform a purchase.
  await sleep(60000);
  await purchaseRegion(coretimeApi, alice);
}

init().then(() => process.exit(0));

async function configureBroker(
  rococoApi: ApiPromise,
  coretimeApi: ApiPromise,
): Promise<void> {
  console.log(`Setting the initial configuration for the broker pallet`);

  const configCall = u8aToHex(
    coretimeApi.tx.broker.configure(consts.CONFIG).method.toU8a(),
  );
  return forceSendXcmCall(rococoApi, CORETIME_CHAIN_PARA_ID, configCall);
}

async function startSales(
  rococoApi: ApiPromise,
  coretimeApi: ApiPromise,
): Promise<void> {
  console.log(`Starting the bulk sale`);

  const startSaleCall = u8aToHex(
    coretimeApi.tx.broker
      .startSales(consts.INITIAL_PRICE, consts.CORE_COUNT)
      .method.toU8a(),
  );
  return forceSendXcmCall(rococoApi, CORETIME_CHAIN_PARA_ID, startSaleCall);
}

async function setBalance(
  rococoApi: ApiPromise,
  coretimeApi: ApiPromise,
  who: string,
  balance: number,
) {
  console.log(`Setting balance of ${who} to ${balance}`);

  const setBalanceCall = u8aToHex(
    coretimeApi.tx.balances.forceSetBalance(who, balance).method.toU8a(),
  );
  return forceSendXcmCall(rococoApi, CORETIME_CHAIN_PARA_ID, setBalanceCall);
}

async function openHrmpChannel(
  rococoApi: ApiPromise,
  sender: number,
  recipient: number,
): Promise<void> {
  console.log(`Openeing HRMP channel between ${sender} - ${recipient}`);

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

async function forceSendXcmCall(
  api: ApiPromise,
  destParaId: number,
  encodedCall: string,
): Promise<void> {
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
          requireWeightAtMost: {
            refTime: 5000000000,
            proofSize: 900000,
          },
          call: {
            encoded: encodedCall,
          },
        },
      },
    ],
  });

  console.log(encodedCall);

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

function featureFlag(flagName: string): boolean {
  return process.argv.includes(`--${flagName}`);
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
