import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import {Region, Timeslice, CoreIndex} from "./types";
import * as consts from "./consts";

const keyring = new Keyring({ type: "sr25519" });

async function init() {
    const coretimeWsProvider = new WsProvider("ws://127.0.0.1:8000");
    const rococoWsProvider = new WsProvider("wss://rococo-rpc.polkadot.io/");

    const coretimeApi = await ApiPromise.create({provider: coretimeWsProvider});
    const rococoApi = await ApiPromise.create({provider: rococoWsProvider});

    await startBulkSale(rococoApi, coretimeApi);
}

init().then(() => process.exit(0));

async function startBulkSale(rococoApi: ApiPromise, coretimeApi: ApiPromise) {
    const latestRcBlock = (await rococoApi.rpc.chain.getHeader()).number.toNumber()
    await setStatus(coretimeApi, latestRcBlock);
    await createMockRegions(coretimeApi, currentTimeslice(latestRcBlock), 5);
}

async function setStatus(coretimeApi: ApiPromise, latestRcBlock: number) {
    const commitTimeslice = getLatestTimesliceReadyToCommit(latestRcBlock);

    const status = {
        core_count: consts.CORE_COUNT,
        private_pool_size: 0,
        system_pool_size: 0,
        last_committed_timeslice: currentTimeslice(commitTimeslice) - 1,
        last_timeslice: currentTimeslice(latestRcBlock)
    };

    await coretimeApi.rpc('dev_setStorage', {
    broker: {
        status
    }
    })
    await coretimeApi.rpc('dev_newBlock');
} 

async function createMockRegions(coretimeApi: ApiPromise, currentTimeslice: Timeslice, regionCount: number) {
    let regions: Array<Region> = [];
    const owner = keyring.addFromUri("//Alice").address;

    for(let i = 0; i < regionCount; i++) {
        const mask = i % 2 == 0 ? consts.FULL_MASK : consts.HALF_FULL_MASK;
        const duration = 10;
        regions.push(mockRegion(currentTimeslice, i, mask, currentTimeslice + duration, owner));
    }

    await coretimeApi.rpc('dev_setStorage', {
    broker: {
        regions: regions.map((region) => [[region.regionId], region.regionRecord])
    }
    });
    await coretimeApi.rpc('dev_newBlock');
}

function mockRegion(begin: Timeslice, core: CoreIndex, mask: string, end: Timeslice, owner: string): Region {
    return {
        regionId: {
        begin,
        core,
        mask
    },
    regionRecord: {
        end,
        owner,
        paid: null
    }
}
}

function currentTimeslice(latestRcBlock: number) {
    return Math.floor(latestRcBlock / consts.TIMESLICE) * consts.TIMESLICE_PERIOD;
}

function getLatestTimesliceReadyToCommit(latestRcBlock: number): Timeslice {
    let advanced = latestRcBlock + consts.CONFIG.advance_notice;
    return advanced / consts.TIMESLICE_PERIOD;
}
