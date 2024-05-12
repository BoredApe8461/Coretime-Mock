
# Simulated Coretime Environment


The primary purpose of this repository is to provide all the necessary components for testing the [RegionX-Node](https://github.com/RegionX-Labs/RegionX-Node), as well as the [RegionX CoreHub UI](https://github.com/RegionX-Labs/CoreHub).

## Topology

The local environment consists of three chains:

-   Rococo relay chain
-   Coretime parachain
-   RegionX parachain

<p align="center">
 <img src="./docs/topology.png" />
</p>

The two parachains are connected through HRMP channels in both directions. In our mock environment, the RegionX parachain treats the Coretime chain as a reserve chain for Coretime regions, thus supporting reserve transfers.

The XCM Nonfungible `Index` of each region corresponds to the encoded [`RegionId`](https://github.com/paritytech/polkadot-sdk/blob/2aa006e094e248110af14a742d4e2f56b7931959/substrate/frame/broker/src/types.rs#L55).

## Getting started with Zombienet

Before proceeding, ensure that Zombienet is set up on the machine and accessible from the PATH. Linux and macOS executables for the Zombienet CLI are available [here](https://github.com/paritytech/zombienet/releases).

Follow the first three steps from the [RegionX-Node README](https://github.com/RegionX-Labs/RegionX-Node?tab=readme-ov-file#running-zombienet-tests) to get all the necessary binaries. After getting them move them to `Coretime-Mock/bin` directory.

After that we can run the zombienet network:
```
npm run zombienet
```

After waiting a few seconds for the network initialization and once **both** parachains **start producing blocks**, we can proceed with setting up the environment.

This repo provides an initialization program which will based on the selected options set up the local network accordingly. The program provides the following options:

1.  `--relayInit`:
    
    -   Opens two HRMP channels: Coretime Chain <--> RegionX chain

2.  `--coretimeInit`:
    
    -    Initializes the Coretime chain by setting the initial configuration, starting the bulk sale, and purchasing a region.
3.  `--regionxInit`:
    
    -    Initializes the RegionX chain by registering the relay chain token in its asset-registry.

4.  `--coretimeAccount <string>`:
    
    -   When specified the program will transfer the purchased region to this account.
5.  `--regionxAccount <string>`:
    
    -   The initialization script will fund the specified account with relay chain tokens.

### Example: Setting up the full environment

1. Run `npm run zombienet` in a separate terminal
2.  Once the parachains **started producing blocks**,  setup the environment using the command below:
	 ```sh
	npm run init -- \
	--coretimeInit \
	--relayInit \
	--regionxInit \
	--coretimeAccount "<ADDRESS PLACEHOLDER>" \
	--regionxAccount "<ADDRESS PLACEHOLDER>" 
	```

## Getting started with Chopsticks

Since the Coretime chain is deployed on Rococo, we can use Chopsticks for parts of local frontend testing that do not require the contracts.

The steps to run a Coretime chain locally and setup the mock environment:

```sh
cd Coretime-Mock

npm i

# This will run a parallel copy of the Coretime chain
npm run chopsticks

# In a new terminal:

# This will add some mock data to the Coretime chain
npm run chopsticks-init
```
