# Simulated Coretime Environment 

The purpose of this directory is to consolidate all the necessary components for testing RegionX functionality in one place. This repository offers zombienet scripts, simplifying the process of spinning up the required chains for testing.

### Topology

The local environment consists of three chains:
- Rococo relay chain
- Coretime parachain
- Swanky parachain (NOTE: This can be replaced by any parachain that supports WASM contracts)

<p align="center">
 <img src="./docs/topology.png" />
</p>

### Getting started

To run the local environment, we will first need to get all the necessary binaries. 

If we only want to test functionality that is not related to any of the contracts, we can simply run the minimal_network.toml zombienet script:

```
# This will only run the Rococo relay chain and the Coretime chain
./scripts/minimal_init.sh

./zombienet-linux -p native spawn ./zombienet/minimal_network.toml
```

In case we want to run the full local network, which will allow us to test the contracts as well, the following commands need to be run instead:

```
# This will only run the Rococo relay chain and the Coretime chain
./scripts/full_init.sh

./zombienet-linux -p native spawn ./zombienet/full_network.toml
```
