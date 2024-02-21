import { ApiPromise, WsProvider } from "@polkadot/api";
import { keyring, log } from "../utils";

export async function relayInit(relayEndpoint: string, coretimeParaId: number, contractsParaId: number) {
  const relayWsProvider = new WsProvider(relayEndpoint);
  const relayApi = await ApiPromise.create({ provider: relayWsProvider });

  openHrmpChannel(relayApi, coretimeParaId, contractsParaId);
}

async function openHrmpChannel(relayApi: ApiPromise, sender: number, recipient: number): Promise<void> {
  log(`Openeing HRMP channel between ${sender} - ${recipient}`);

  const newHrmpChannel = [
    sender,
    recipient,
    8, // Max capacity
    512, // Max message size
  ];

  const alice = keyring.addFromUri("//Alice");

  const openHrmp = relayApi.tx.hrmp.forceOpenHrmpChannel(...newHrmpChannel);
  const sudoCall = relayApi.tx.sudo.sudo(openHrmp);

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
