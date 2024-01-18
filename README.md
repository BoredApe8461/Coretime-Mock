# Simulated Coretime Environment

The purpose of this directory is to consolidate all the necessary components for testing RegionX functionality in one place. This repository offers zombienet scripts, simplifying the process of spinning up the required chains for testing.

### Topology

The local environment consists of three chains:

-   Rococo relay chain
-   Coretime parachain
-   Astar Shibuya parachain

<p align="center">
 <img src="./docs/topology.png" />
</p>

### Getting started with Zombienet

NOTE: Before proceeding make sure to have zombienet setup on your machine and accessible from your PATH.
You can find linux and macOS executables of the Zombienet CLI [here](https://github.com/paritytech/zombienet/releases)

```sh
# Clone the repo:
git clone https://github.com/RegionX-Labs/Coretime-Mock.git

# Pull the submodules:
git submodule update --init
```

To run the local environment, we will first need to get all the necessary binaries.

If we only want to test functionality that is not related to any of the contracts, we can simply run the `minimal_network.toml` zombienet script:

```sh
# This script compiles all the necessary binaries for running a Rococo relay chain,
# Coretime chain.
./scripts/minimal_init.sh

npm i

# Runs the zombienet network:
npm run zombienet

# After waiting a few minutes for the network initialization and once the parachain 
# begins block production, we can proceed to initialize the Coretime chain. 
# This can be done by executing the following command:
npm run zombienet-init  
```

In case we want to run the full local network, which will allow us to test the contracts as well, the following commands need to be run instead:

```sh
# This script compiles all the necessary binaries for running a Rococo relay chain,
# Coretime chain, and a smart contract chain.
./scripts/full_init.sh

npm i

# Runs the full zombienet network:
npm run zombienet:full
```

After waiting a few minutes for the network initialization and once both parachains begin block production, we can proceed to initialize the environment.

This repo provides an init program which will based on the selected options set up the local network appropriately. The program exposes the following options:

1.  `--fullNetwork`:
    
    -   Description: When set the program will spin up the contracts chain and open an HRMP channel with the Coretime chain.

2.  `--contracts <string>`:
    
    -   Description: Sets the path to the compiled RegionX contracts.

3.  `--contractsAccount <string>`:
    
    -   Description:  Specify an account on the contracts chain. When specified the program will transfer a mock xc-region to this account.
    
4.  `--coretimeAccount <string>`:
    
    -   Description: Specify an account on the coretime chain. When specified the program will transfer a mock region to this account.

**An example with all options:**

> NOTE: As explained above `npm run zombienet:full` must be running in the background to be able to proceed with the following steps:

```sh
# Before executing the zombienet-init:full command, ensure that the contracts within the RegionX directory are compiled.  
# Before compiling the contract make sure the pallet index is configured correctly for Shibuya: 
# https://github.com/RegionX-Labs/RegionX?tab=readme-ov-file#4-deploy
# To compile the contracts, navigate to the RegionX directory and execute the following commands:  
# 
# cd RegionX/contracts/xc-regions
# cargo contract build
# 
# After successful compilation, you can initialize the full network setup using the command below.

npm run zombienet-init:full -- \
  --contracts ../RegionX/target/ink/ \
  --coretimeAccount "<account on coretime chain>" \
  --contractsAccount "<account on contracts chain>"
```

### Getting started with Chopsticks

The Coretime chain is already deployed on Rococo (🥳), allowing us to use Chopsticks for aspects of local frontend testing that do not require the xc-regions contract.

The steps to run a Coretime chain locally and setup the mock environment:

```sh
npm i

# This will run a parallel copy of the Coretime chain
npm run chopsticks

# In a new terminal:

# This will add some mock data to the Coretime chain
npm run chopsticks-init
```
