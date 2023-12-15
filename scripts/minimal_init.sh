#!/bin/bash

if [ -d "bin" ]; then
    rm -r bin/
else 
    mkdir bin/
fi

cd polkadot-sdk/

# Build the polkadot relay chain binary. Needed to run rococo.
cargo build --locked --profile testnet --features fast-runtime --bin polkadot --bin polkadot-prepare-worker --bin polkadot-execute-worker

# Build the polkadot-parachain binary. Needed to run the Coretime chain.
cd cumulus/polkadot-parachain
cargo build --release
cd ../../

cp ./target/release/polkadot-parachain ../bin/
cp ./target/release/polkadot ../bin/
cp ./target/release/polkadot-execute-worker ../bin/
cp ./target/release/polkadot-prepare-worker ../bin/

cd ..
