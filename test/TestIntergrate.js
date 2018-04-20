const WNS = artifacts.require('WNSRegistry.sol');
const AuctionRegistrar = artifacts.require('Registrar.sol');
const Deed = artifacts.require('Deed.sol');
const FIFS = artifacts.require('FIFSRegistrar.sol');
const PublicResolver = artifacts.require('PublicResolver.sol');
const ReverseResolver = artifacts.require('DefaultReverseResolver.sol');

const utils = require('./helpers/Utils.js');
const web3Utils = require('web3-utils');
const namehash = require('eth-ens-namehash');

contract('WNS', function (accounts) {

    let wns;


    beforeEach(async () => {
        wns = await WNS.new();
        
    });

    it('should allow ownership transfers', async () => {  
        let result = await wns.setOwner(0, '0x1234', {from: accounts[0]});

        assert.equal(await wns.owner(0), '0x0000000000000000000000000000000000001234')

        assert.equal(result.logs.length, 1);
        let args = result.logs[0].args;
        assert.equal(args.node, "0x0000000000000000000000000000000000000000000000000000000000000000");
        assert.equal(args.owner, "0x0000000000000000000000000000000000001234");
    });
});
