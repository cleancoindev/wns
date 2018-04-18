module.exports = {
  networks: {
    'dev.fifs': {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 0x2e90edd000, //200GWei
      gas: 1000000//,
      //from: ""      
    },
    'dev.auction': {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 0x2e90edd000, //200GWei
      //gasPrice: 0x2e90,
      gas: 4700000,
      from: ""
    }
  }
};
