#!/usr/bin/env bash
if [ ! -f ./bin/soroban ]; then
    os=$(uname -s)
    if [[ "$os" == "Darwin" ]]; then
        wget -O soroban-cli.tar.gz https://github.com/stellar/soroban-tools/releases/download/v20.0.1/soroban-cli-20.0.1-aarch64-apple-darwin.tar.gz
    else
        wget -O soroban-cli.tar.gz https://github.com/stellar/soroban-tools/releases/download/v20.0.1/soroban-cli-20.0.1-x86_64-unknown-linux-gnu.tar.gz
    fi
    tar -xf soroban-cli.tar.gz && mv soroban ./bin
    rm soroban-cli.tar.gz
fi

./bin/soroban contract bindings typescript \
    --network futurenet \
    --contract-id $(cat .soroban/calorie-tracker-id) \
    --output-dir node_modules/calorie-tracker-client
cd node_modules/calorie-tracker-client
sed -i'' -e 's/"stellar-sdk": "11.0.0-beta.6"/"stellar-sdk": "11.0.1"/g' ./package.json
npm install
