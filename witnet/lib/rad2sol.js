#!/usr/bin/env node

const fs = require("fs")
const vm = require("vm")

const babel = require("@babel/core")
const CBOR = require("cbor")
const protobuf = require("protocol-buffers")
const witnetRequests = require("witnet-requests")

const requestsDir = "./requests/"
const requestContractsDir = "./contracts/requests/"
const userContractsDir = "./contracts/"
const migrationsDir = "./migrations/"
const schemaDir = "./witnet/schema/"

const libAddresses = {
  rinkeby: {
    BlockRelay: "0x88fEF6805ADD0029a919981D6c5579238B008577",
    CBOR: "0x22091dB676f634E3e1ecAADc3b4f922984fA842b",
    Witnet: "0xFECE4CAe3fFAABd59F161045f4b93CC9D894EB99",
    WitnetBridgeInterface: "0xf0C67374D08e72dd7424982F76870AE0D6F2055e",
  },
  goerli: {
    BlockRelay: "0xf84dcE5f5fc334a88c2FCbe68bEA04C343a1530c",
    CBOR: "0xB154e5AF823eEe145B3A7A0301c6D673E9Fa6248",
    Witnet: "0x820E08993084c6685ee5295470936496607d164A",
    WitnetBridgeInterface: "0x1053c33f1DcFF9c8F6F6DC07e3F8cb84e46232A1",
  },
}

const prototype = loadPrototype("witnet")

/*
 * HERE GOES THE MAIN BUSINESS LOGIC OF THE COMPILER SCRIPT.
 */

const requestNames = fs.readdirSync(requestsDir)
  .filter(fileName => fileName.match(/.*\.js$/))

const exampleNames = fs.readdirSync(userContractsDir)
  .filter(exampleName => exampleName.match(/.*\.sol$/))

const steps = [
  fileName => `${requestsDir}${fileName}`,
  path => { console.log(`> Compiling ${path}`); return path },
  readFile,
  compile,
  (code, i) => execute(code, requestNames[i]),
  pack,
  intoProtoBuf,
  buff => buff.toString("hex"),
  (hex, i) => intoSol(hex, requestNames[i]),
  (sol, i) => writeSol(sol, requestNames[i]),
]

requestsBanner()
Promise.all(steps.reduce(
  (prev, step) => prev.map((p, i) => p.then(v => step(v, i))),
  requestNames.map(fileName => Promise.resolve(fileName))))
  .then(requestsSucceed)
  .then(migrationsBanner)
  .then(writeMigrations)
  .then(migrationsSucceed)
  .catch(fail)

/*
 * THESE ARE THE DIFFERENT STEPS THAT CAN BE USED IN THE COMPILER SCRIPT.
 */

function tap (x) {
  console.log(x)
  return x
}

function requestsBanner () {
  console.log(`
Compiling your Witnet requests...
=================================`)
}

function requestsSucceed (_) {
  console.log(`
> All requests compiled successfully
`)
}

function migrationsBanner () {
  console.log(`
Generating automatic migrations for your contracts...
=====================================================`)
}

function migrationsSucceed (_) {
  console.log(`
> All migrations written successfully \x1b[33m(please remember to manually customize them if necessary)\x1b[0m.
`)
}

function fail (error) {
  console.error(`
! \x1b[31mWITNET REQUESTS COMPILATION ERRORS:\x1b[0m
  - ${error.message}`)
  process.exitCode = 1
  throw error
}

function readFile (path) {
  return fs.readFileSync(path, "utf8")
}

function loadPrototype (fileName) {
  return protobuf(readFile(`${schemaDir}${fileName}.proto`))
}

function compile (code) {
  const newCode = babel.transformSync(code,
    {
      "plugins": [
        ["@babel/plugin-transform-modules-commonjs", {
          "allowTopLevelThis": true,
        }],
      ],
    }).code
  return newCode
}

function execute (code, requestName) {
  const context = vm.createContext({
    module: {},
    exports: {},
    require,
  })

  try {
    return vm.runInContext(code, context, __dirname).asJson()
  } catch (e) {
    let error = e
    if (e.message.includes("is not a function")) {
      error = Error(`\x1b[1m${requestName} has one of these issues:\x1b[0m\n\
    1: \x1b[1mIt is missing the \`export\` statement\x1b[0m\n\
       Adding this line at the end of ${requestName} may help (please replace \`request\` by the name of your request \
object):
      
         export {request as default}

    2: \x1b[1mThe exported object is not an instance of the \`Request\` class\x1b[0m
       Please double-check that ${requestName} contains an instance of the \`Request\` class and it is exported as \
explained in issue 1.
       New instances of the \`Request\` class are created like this:

         const request = new Request()
         
       The Witnet documentation contains a complete tutorial on how to create requests from scratch:
       https://witnet.github.io/documentation/try/my-first-data-request/#write-your-first-witnet-request
    
    (Node.js error was: ${e})`
      )
    } else if (e.message.includes("is not defined")) {
      const missing = e.message.match(/(.*) is not defined/)[1]
      if (witnetRequests.hasOwnProperty(missing)) {
        error = Error(`\x1b[1m${requestName} is missing an import for the \`${missing}\` module\x1b[0m
    Adding this line at the beginning of ${requestName} may help:
      
         import { ${missing} } from "witnet-requests"
    
    (Node.js error was: ${e})`)
      }
    }
    throw error
  }
}

function pack (dro) {
  const retrieve = dro.data_request.retrieve.map((branch) => {
    return { ...branch, script: CBOR.encode(branch.script) }
  })
  const aggregate = { ...dro.data_request.aggregate, script: CBOR.encode(dro.data_request.aggregate.script) }
  const tally = { ...dro.data_request.tally, script: CBOR.encode(dro.data_request.tally.script) }

  return { ...dro, data_request: { ...dro.data_request, retrieve, aggregate, tally } }
}

function intoProtoBuf (request) {
  const buf = prototype.DataRequestOutput.encode(request)
  return buf
}

function intoSol (hex, fileName) {
  const contractName = fileName.replace(/\.js/, "")

  return `pragma solidity ^0.5.0;

import "witnet-ethereum-bridge/contracts/Request.sol";

// The bytecode of the ${contractName} request that will be sent to Witnet
contract ${contractName}Request is Request {
  constructor () Request(hex"${hex}") public { }
}
`
}

function writeSol (sol, fileName) {
  const solFileName = fileName.replace(/\.js/, ".sol")
  fs.writeFileSync(`${requestContractsDir}${solFileName}`, sol)
  return fileName
}

function writeMigrations () {
  const artifacts = exampleNames
    .filter(fileName => fileName !== "Migrations.sol")
    .map(fileName => `${fileName[0].toUpperCase()}${fileName.slice(1).replace(".sol", "")}`)

  const stage2 = `// WARNING: DO NOT DELETE THIS FILE
// This file was auto-generated by the Witnet compiler, any manual changes will be overwritten.
const BlockRelay = artifacts.require("BlockRelay")
const WitnetBridgeInterface = artifacts.require("WitnetBridgeInterface")
const CBOR = artifacts.require("CBOR")
const Witnet = artifacts.require("Witnet")

const addresses = ${JSON.stringify(libAddresses, null, 2).replace(/(["}])$\n/gm, (m, p1) => `${p1},\n`)}

module.exports = function (deployer, network) {
  if (network in addresses) {
    Witnet.address = addresses[network]["Witnet"]
    WitnetBridgeInterface.address = addresses["rinkeby"]["WitnetBridgeInterface"]
  } else {
    deployer.deploy(BlockRelay).then(() => {
      return deployer.deploy(WitnetBridgeInterface, BlockRelay.address)
    })
    deployer.deploy(CBOR)
    deployer.link(CBOR, Witnet)
    deployer.deploy(Witnet)
  }
}
`
  fs.writeFileSync(`${migrationsDir}2_witnet_core.js`, stage2)

  const userContractsArgs = readMigrationArgs()

  const stage3 = `// This file was auto-generated by the Witnet compiler, any manual changes will be overwritten except
// each contracts' constructor arguments (you can freely edit those and the compiler will respect them).
const Witnet = artifacts.require("Witnet")
const WitnetBridgeInterface = artifacts.require("WitnetBridgeInterface")
${artifacts.map(artifact => `const ${artifact} = artifacts.require("${artifact}")`).join("\n")}

module.exports = function (deployer) {
  deployer.link(Witnet, [${artifacts.join(", ")}])
${artifacts.map(artifact => {
    if (artifact in userContractsArgs) {
      const args = userContractsArgs[artifact]
        .split(/[(,)]/).slice(2).reverse().slice(1).reverse().map(x => x.trim()).join(", ")
      console.log(`> ${artifact}: reusing existing constructor arguments (${args})`)
      return userContractsArgs[artifact]
    } else {
      const args = [artifact, ...mockSolidityArgs(readSolidityArgs(artifact))]
      console.log(`> ${artifact} generating default constructor arguments (${args.slice(1).join(", ")})
  \x1b[33mWARNING: the autogenerated argument values may not make sense for the logic of the ${artifact}` +
        " contract's constructor.\n  Please make sure you customize them if needed before actually deploying anything" +
        ".\x1b[0m")
      return `  deployer.deploy(${args.join(", ")})`
    }
  }).join("\n")}
}
`
  fs.writeFileSync(`${migrationsDir}3_user_contracts.js`, stage3)
}

function readSolidityArgs (artifact) {
  const content = readFile(`${userContractsDir}${artifact}.sol`)
  const regex = /constructor\s*\(([\w\s,]*)/m
  return content.match(regex)[1]
}

function readMigrationArgs (artifact) {
  fs.closeSync(fs.openSync(`${migrationsDir}3_user_contracts.js`, "a"))
  const content = readFile(`${migrationsDir}3_user_contracts.js`)
  const regex = /^\s*deployer\.deploy\([\s\n]*(\w+)[^)]*\)/mg
  return matchAll(regex, content).reduce((acc, match) => ({ ...acc, [match[1]]: match[0] }), {})
}

function mockSolidityArgs (args) {
  const mocks = {
    "uint": 0,
    "uint8": 0,
    "uint16": 0,
    "uint32": 0,
    "uint64": 0,
    "uint128": 0,
    "uint256": 0,
    "int": 0,
    "int8": 0,
    "int16": 0,
    "int32": 0,
    "int64": 0,
    "int128": 0,
    "int256": 0,
    "string": "\"CHANGEME\"",
    "bytes": "\"DEADC0FFEE\"",
    "address": "\"0x0000000000000000000000000000000000000000\"",
    "bool": false,
  }

  return args.split(",").map(arg => {
    const [type, argName] = arg.trim().split(" ")
    if (type === "address" && argName === "_wbi") {
      return "WitnetBridgeInterface.address"
    } else if (mocks.hasOwnProperty(type)) {
      return mocks[type]
    } else {
      return 0;
    }
  })
}

function matchAll (regex, string) {
  const matches = []
  while (true) {
    const match = regex.exec(string)
    if (match === null) break
    matches.push(match)
  }
  return matches
}
