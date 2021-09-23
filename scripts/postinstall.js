#!/usr/bin/env node

const exec = require("child_process").execSync
const os = require("os")

switch (os.type()) {
  case "Windows_NT":
    exec("dir node_modules\\witnet-ethereum-bridge && npm run compile")
    // eslint-disable-next-line max-len
    exec("mkdir build\\contracts\\ && copy node_modules\\witnet-ethereum-bridge\\build\\**\\**\\*.json build\\contracts")
    break
  default:
    exec("cd node_modules/witnet-ethereum-bridge && npm run compile")
    exec("mkdir -p build/contracts/ && cp node_modules/witnet-ethereum-bridge/build/**/**/*.json build/contracts")
}
