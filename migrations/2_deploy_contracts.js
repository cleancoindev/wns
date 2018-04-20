const WNS = artifacts.require("./WNSRegistry.sol");
const FIFSRegistrar = artifacts.require('./FIFSRegistrar.sol');

// Currently the parameter('./ContractName') is only used to imply
// the compiled contract JSON file name. So even though `Registrar.sol` is
// not existed, it's valid to put it here.
// TODO: align the contract name with the source code file name.
const Registrar = artifacts.require('./Registrar.sol');
const publicResolver = artifacts.require('./PublicResolver.sol');
const web3 = new (require('web3'))();
const namehash = require('eth-ens-namehash');

/**
 * Calculate root node hashes given the top level domain(tld)
 *
 * @param {string} tld plain text tld, for example: 'eth'
 */
function getRootNodeFromTLD(tld) {
  return {
    namehash: namehash(tld),
    sha3: web3.sha3(tld)
  };
}

/**
 * Deploy the WNS and FIFSRegistrar
 *
 * @param {Object} deployer truffle deployer helper
 * @param {string} tld tld which the FIFS registrar takes charge of
 */
function deployFIFSRegistrar(deployer, tld) {
  var rootNode = getRootNodeFromTLD(tld);

  // Deploy the WNS first
  deployer.deploy(WNS)
    .then(() => {
      // Deploy the FIFSRegistrar and bind it with WNS
      return deployer.deploy(FIFSRegistrar, WNS.address, rootNode.namehash);
    })
    .then(function() {
      // Transfer the owner of the `rootNode` to the FIFSRegistrar
      WNS.at(WNS.address).setSubnodeOwner('0x0', rootNode.sha3, FIFSRegistrar.address);
      deployer.deploy(publicResolver,WNS.address);
    });
}

/**
 * Deploy the WNS and HashRegistrar(Simplified)
 *
 * @param {Object} deployer truffle deployer helper
 * @param {string} tld tld which the Hash registrar takes charge of
 */
function deployAuctionRegistrar(deployer, tld) {
  var rootNode = getRootNodeFromTLD(tld);

  // Deploy the WNS first
  deployer.deploy(WNS)
    .then(() => {
      // Deploy the HashRegistrar and bind it with WNS
      // The last argument `0` specifies the auction start date to `now`
      return deployer.deploy(Registrar, WNS.address, rootNode.namehash, 0);
    })
    .then(function() {
      // Transfer the owner of the `rootNode` to the HashRegistrar
      WNS.at(WNS.address).setSubnodeOwner('0x0', rootNode.sha3, Registrar.address);
      deployer.deploy(publicResolver,WNS.address);
    });
}

module.exports = function(deployer, network) {
  var tld = 'wan';

  if (network === 'dev.fifs') {
    deployFIFSRegistrar(deployer, tld);
  }
  else if (network === 'dev.auction') {
    deployAuctionRegistrar(deployer, tld);
  }

};
