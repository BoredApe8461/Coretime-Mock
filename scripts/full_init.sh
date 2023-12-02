#!/bin/bash

if [ -d "bin" ]; then
    rm -r bin/
else 
    mkdir bin/
fi

cd polkadot-sdk/

# Build the polkadot relay chain binary. Needed to run rococo.
cargo build --release

# Build the polkadot-parachain binary. Needed to run the Coretime chain.
cd cumulus/polkadot-parachain
cargo build --release
cd ../../

cp ./target/release/polkadot-parachain ../bin/
cp ./target/release/polkadot ../bin/
cp ./target/release/polkadot-execute-worker ../bin/
cp ./target/release/polkadot-prepare-worker ../bin/

cd ../swanky/
cargo build --release
cp ./target/release/swanky-node ../bin/

cd ..
