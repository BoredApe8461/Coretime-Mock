#!/bin/bash

if [ -d "bin" ]; then
    rm -r bin/
fi
mkdir bin/

cd polkadot-sdk/

# Build the polkadot relay chain binary. Needed to run rococo.
cargo build --locked --profile testnet --features fast-runtime --bin polkadot --bin polkadot-prepare-worker --bin polkadot-execute-worker

# Build the polkadot-parachain binary. Needed to run the Coretime chain.
cd cumulus/polkadot-parachain
cargo build --release
cd ../../

cp ./target/release/polkadot-parachain ../bin/
cp ./target/testnet/polkadot ../bin/
cp ./target/testnet/polkadot-execute-worker ../bin/
cp ./target/testnet/polkadot-prepare-worker ../bin/

cd ../Astar/
cargo build --release
cp ./target/release/astar-collator ../bin/

cd ..
