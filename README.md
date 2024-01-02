# Simulated Coretime Environment

The purpose of this directory is to consolidate all the necessary components for testing RegionX functionality in one place. This repository offers zombienet scripts, simplifying the process of spinning up the required chains for testing.

### Topology

The local environment consists of three chains:

-   Rococo relay chain
-   Coretime parachain
-   Swanky parachain (NOTE: This can be replaced by any parachain that supports WASM contracts)

<p align="center">
 <img src="./docs/topology.png" />
</p>

### Getting started with Zombienet

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

During initialization, the script establishes an HRMP connection between the Coretime chain and the smart contract chain. 

After that, the script will setup the Coretime chain, by setting the initial config and starting the bulk sale.

Subsequently, it deploys the xc-region contract, mints a mock region, and stores its metadata.

For easier testing, the script includes a feature allowing users to designate their account. When specified the wrapped region is transferred directly to the account, facilitating straightforward testing on the frontend.

This can be done by executing the following command:
```sh
# NOTE: Before running this command, you must build the xc-region contract.
npm run zombienet-init:full -- --contracts ../RegionX/target/ink/ --account <account on contracts chain>
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
