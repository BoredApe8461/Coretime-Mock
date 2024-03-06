import { ApiPromise, WsProvider } from "@polkadot/api";
import { keyring, log } from "../utils";

export async function relayInit(relayEndpoint: string, coretimeParaId: number, contractsParaId: number) {
  const relayWsProvider = new WsProvider(relayEndpoint);
  const relayApi = await ApiPromise.create({ provider: relayWsProvider });

  await openHrmpChannel(relayApi, coretimeParaId, contractsParaId);
  await openHrmpChannel(relayApi, contractsParaId, coretimeParaId);
}

async function openHrmpChannel(relayApi: ApiPromise, sender: number, recipient: number): Promise<void> {
  log(`Openeing HRMP channel between ${sender} - ${recipient}`);

  const newHrmpChannel = [
    sender,
    recipient,
    8, // Max capacity
    102400, // Max message size
  ];

  const alice = keyring.addFromUri("//Alice");

  const openHrmp = relayApi.tx.parasSudoWrapper.sudoEstablishHrmpChannel(...newHrmpChannel);
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
