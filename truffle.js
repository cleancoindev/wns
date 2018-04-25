module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 4700000,
      gasPrice: 1e6
    },    
    'dev.fifs': {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 0x2e90edd000, //200GWei
      //gas: 1000000//,
      gas: 4700000,
      from: "0x77E00Ae5BFD8ba7Fc476Cf28448A9A521C8bf2de"
    },
    'dev.auction': {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 0x2e90edd000, //200GWei
      //gasPrice: 0x2e90,
      gas: 4700000,
      from: "0x77E00Ae5BFD8ba7Fc476Cf28448A9A521C8bf2de"
    },
    'testnet': {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 0x2e90edd000, //200GWei
      //gas: 1000000//,
      gas: 4700000
    }
  }
};
