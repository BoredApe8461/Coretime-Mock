import { ApiPromise, Keyring } from "@polkadot/api";

export const keyring = new Keyring({ type: "sr25519" });

export function log(message: string) {
  // Green log.
  console.log("\x1b[32m%s\x1b[0m", message);
}

export function normalizePath(path: string) {
  if (path.endsWith("/") && path.length > 1) {
    return path.slice(0, -1);
  }
  return path;
}

export async function setBalance(coretimeApi: ApiPromise, who: string, balance: string) {
  log(`Setting balance of ${who} to ${balance}`);

  const setBalanceCall = coretimeApi.tx.balances.forceSetBalance(who, balance);
  return force(coretimeApi, setBalanceCall);
}

export async function force(api: ApiPromise, call: any): Promise<void> {
  const sudoCall = api.tx.sudo.sudo(call);

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
