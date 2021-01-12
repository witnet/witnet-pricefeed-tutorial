/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura API
 * keys are available for free at: infura.io/register
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    development: {
      provider: require("ganache-cli").provider({ gasLimit: 100000000 }),
      network_id: "*",
    },
    rinkeby: {
      network_id: 4,
      host: "localhost",
      port: 9004,
      gas: 6500000,
    },
    ropsten: {
      network_id: 3,
      host: "localhost",
      port: 9005,
      gas: 6500000,
    },
    goerli: {
      network_id: 5,
      host: "localhost",
      port: 9006,
      gas: 6500000,
    },
  },

  // The `solc` compiler is set to optimize output bytecode with 200 runs, which is the standard these days
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {optimizer: { enabled: true, runs: 200 } }},
  },

  // This plugin allows to verify the source code of your contracts on Etherscan with this command:
  // ETHERSCAN_API_KEY=<your_etherscan_api_key> truffle run verify <contract_name> --network <network_name>
  plugins: [
    "truffle-plugin-verify",
  ],

  // This is just for the `truffle-plugin-verify` to catch the API key
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
}
