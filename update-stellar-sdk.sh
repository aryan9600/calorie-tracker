#!/usr/bin/env bash

soroban contract bindings typescript \
    --network futurenet \
    --contract-id $(cat .soroban/calorie-tracker-id) \
    --output-dir node_modules/calorie-tracker-client
cd node_modules/calorie-tracker-client
sed -i'' -e 's/"stellar-sdk": "11.0.0-beta.6"/"stellar-sdk": "11.0.1"/g' ./package.json
npm install
