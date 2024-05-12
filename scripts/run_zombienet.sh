#!/bin/bash

zombienet_args="-p native spawn ./zombienet/network.toml"

if which zombienet-macos &> /dev/null; then
    zombienet-macos $zombienet_args
elif which zombienet-linux &> /dev/null; then
    zombienet-linux $zombienet_args
elif which zombienet &> /dev/null; then
    zombienet $zombienet_args
else
    echo "Zombienet couldn't be located"
fi
