// STOP!
// Are you thinking of using this in an app? Don't!
// This script is designed for interactive use in the go-ethereum console.
// For use in an app, consider one of these fine libraries:
//  - https://www.npmjs.com/package/ethjs-ens
//  - https://www.npmjs.com/package/ethereum-ens
/*
function namehash(name) {
    var node = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (name != '') {
        var labels = name.split(".");
        for(var i = labels.length - 1; i >= 0; i--) {
            node = web3.sha3(node + web3.sha3(labels[i]).slice(2), {encoding: 'hex'});
        }
    }
    return node.toString();
}

var ensContract = web3.eth.contract();
var ens = ensContract.at('0x314159265dd8dbb310642f98f50c066173c1259b');

var auctionRegistrarContract = web3.eth.contract();
var ethRegistrar = auctionRegistrarContract.at(ens.owner(namehash('eth')));

var deedContract = web3.eth.contract();

var fifsRegistrarContract = web3.eth.contract();

var resolverContract = web3.eth.contract();

function getAddr(name) {
  var node = namehash(name)
  var resolverAddress = ens.resolver(node);
  if (resolverAddress === '0x0000000000000000000000000000000000000000') {
    return resolverAddress;
  }
  return resolverContract.at(resolverAddress).addr(node);
}

var publicResolver = resolverContract.at(getAddr('resolver.eth'));

var reverseRegistrarContract = web3.eth.contract();
var reverseRegistrar = reverseRegistrarContract.at(ens.owner(namehash('addr.reverse')));

function getContent(name) {
  var node = namehash(name)
  var resolverAddress = ens.resolver(node);
  if (resolverAddress === '0x0000000000000000000000000000000000000000') {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
  return resolverContract.at(resolverAddress).content(node);
}
