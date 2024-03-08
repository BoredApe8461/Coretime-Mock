
# Simulated Coretime Environment


The primary purpose of this repository is to provide all the necessary components for testing the [RegionX contracts](https://github.com/RegionX-Labs/RegionX), as well as the [RegionX CoreHub UI](https://github.com/RegionX-Labs/CoreHub).

## Topology

The local environment consists of three chains:

-   Rococo relay chain
-   Coretime parachain
-   Astar Shibuya parachain

<p align="center">
 <img src="./docs/topology.png" />
</p>

The two parachains are connected through HRMP channels in both directions. In our mock environment, the Shibuya parachain treats the Coretime chain as a reserve chain for Coretime regions, thus supporting reserve transfers.

The Shibuya chain will represent the derivatives of Coretime regions as standard NFTs. This means that regions are presented as a single NFT collection, where the `ItemId` of each region corresponds to the encoded [`RegionId`](https://github.com/paritytech/polkadot-sdk/blob/2aa006e094e248110af14a742d4e2f56b7931959/substrate/frame/broker/src/types.rs#L55).

## Getting started with Zombienet

Before proceeding, ensure that Zombienet is set up on the machine and accessible from the PATH. Linux and macOS executables for the Zombienet CLI are available [here](https://github.com/paritytech/zombienet/releases).

```sh
# Clone the repo:
git clone https://github.com/RegionX-Labs/Coretime-Mock.git

# Pull the submodules:
git submodule update --init
```

To initiate the local environment, it is essential to get all the necessary binaries.

```sh
# This script compiles all the necessary binaries for running the Rococo relay chain,
# Coretime chain, and the Shibuya parachain.
./scripts/full_init.sh
```

After successful compilation, the local network can be initiated:
```
npm run zombienet:full
```

After waiting a few minutes for the network initialization and once **both** parachains **start producing blocks**, we can proceed with setting up the environment.

This repo provides an initialization program which will based on the selected options set up the local network accordingly. The program provides the following options:

1.  `--relayInit`:
    
    -   Opens two HRMP channels: Coretime Chain <--> Contracts chain

2.  `--coretimeInit`:
    
    -    Initializes the Coretime chain by setting the initial configuration, starting the bulk sale, and purchasing a region.

3.  `--coretimeAccount <string>`:
    
    -   When specified the program will transfer the purchased region to this account.

4.  `--contractsInit`:
    
    -   Initializes the contracts parachain by creating a collection that represents Coretime regions. Also, deploys both the `xc-regions` and the `coretime-market` contracts.
  
5.  `--mintXcRegions`:
    
    -   Mints a couple of mock xc-regions. Convenient for testing the market functionality.

6.  `--contractsAccount <string>`:
    
    -   When specified the program will transfer the mock xc-regions to this account.

7.  `--contractsPath <string>`:
    
    -   The path to the compiled contracts.

### Example: Testing contracts only:

> NOTE: In this case, we don't need to run the zombienet network, instead it is expected that the `astar-collator` node is running in the background in `--dev` mode at port `9920`. 
> 
> Command for running the node:  `astar-collator --dev --rpc-port 9920`

1.  Compile the contracts within the RegionX directory
	 ```sh
	cd RegionX/contracts/xc-regions
	cargo contract build

	cd ../coretime_market
	cargo contract build
	```

2.  After successful compilation, setup the environment using the command below:
	 ```sh
	npm run zombienet-init -- \
	--contractsInit \
	--contractsPath ../RegionX/target/ink/ \
	--contractsAccount "<ADDRESS PLACEHOLDER>" \
  	--mintXcRegions
	```

### Example: Testing with full environment
> NOTE: For the following steps to function, it is required to execute `npm run zombienet:full` in the background.

1.  Compile the contracts in the RegionX directory
	 ```sh
	cd RegionX/contracts/xc-regions
	cargo contract build

	cd ../coretime_market
	cargo contract build
	```
2.  After successful compilation and once all the parachains **started producing blocks**,  setup the environment using the command below:
	 ```sh
	npm run zombienet-init -- \
	--contractsInit \
	--coretimeInit \
	--relayInit \
	--contractsPath ../RegionX/target/ink/ \
	--contractsAccount "<ADDRESS PLACEHOLDER>" \
	--coretimeAccount "<ADDRESS PLACEHOLDER>"
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
