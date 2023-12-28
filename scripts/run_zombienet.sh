#!/bin/bash

start_full="-p native spawn ./zombienet/full_network.toml"
start_minimal="-p native spawn ./zombienet/minimal_network.toml"

# Check the mode and set the appropriate arguments
if [ "$1" == "full" ]; then
    zombienet_args=$start_full
elif [ "$1" == "minimal" ]; then
    zombienet_args=$start_minimal
else
    echo "Invalid mode. Please specify 'full' or 'minimal'."
    exit 1
fi

if which zombienet-macos &> /dev/null; then
    zombienet-macos $zombienet_args
elif which zombienet &> /dev/null; then
    zombienet $zombienet_args
else
    echo "Zombienet couldn't be located"
fi
