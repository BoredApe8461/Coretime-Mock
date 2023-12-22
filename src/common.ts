import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import * as consts from "./consts";

export async function purchaseRegion(
  coretimeApi: ApiPromise,
  buyer: KeyringPair,
): Promise<void> {
  console.log(`Purchasing a reigon.`);

  const callTx = async (resolve: () => void) => {
    const purchase = coretimeApi.tx.broker.purchase(consts.INITIAL_PRICE * 2);
    const unsub = await purchase.signAndSend(buyer, (result: any) => {
      if (result.status.isInBlock) {
        unsub();
        resolve();
      }
    });
  };

  return new Promise(callTx);
}
