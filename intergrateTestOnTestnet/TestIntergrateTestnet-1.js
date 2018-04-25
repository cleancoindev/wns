const WNS = artifacts.require('WNSRegistry.sol');
const AuctionRegistrar = artifacts.require('Registrar.sol');
const Deed = artifacts.require('Deed.sol');
const FIFS = artifacts.require('FIFSRegistrar.sol');
const PublicResolver = artifacts.require('PublicResolver.sol');
const ReverseResolver = artifacts.require('DefaultReverseResolver.sol');
const TestRegistrar = artifacts.require('TestRegistrar.sol');

const utils = require('./helpers/Utils.js');
const web3Utils = require('web3-utils');
const namehash = require('eth-ens-namehash');


/*
personal.unlockAccount(eth.accounts[0], 'wanchain', 999999);
personal.unlockAccount(eth.accounts[1], 'wanchain', 999999);
personal.unlockAccount(eth.accounts[2], 'wanchain', 999999);
personal.unlockAccount(eth.accounts[3], 'wanchain', 999999);
*/

const testAccounts = ["0x77e00ae5bfd8ba7fc476cf28448a9a521c8bf2de", "0xb0cbd15e3db349bdb3dd531a359b2a8299d9ce47", "0xba4968852605279de8db10fccf52209e31dd6a8b", "0x7cd6c0e945acdfa1874f429c76653c9f7c27f82a"];
contract('WNS', function (accounts) {

    let addrDeploy = testAccounts[0];
    let addrFoundation = testAccounts[1];
    let addrAuction = testAccounts[2];
    let addrTest = testAccounts[3]

    let wns;
    let testRegistrar;
    let auctionRegistrar;
    let publicResolver;

    async function getAddr(name) {
        var node = namehash(name)
        var resolverAddress = await wns.resolver(node);
        if (resolverAddress === '0x0000000000000000000000000000000000000000') {
            return resolverAddress;
        }
        return await PublicResolver.at(resolverAddress).addr(node);
    }    


    beforeEach(async () => {
    });
    
    
    it('integrate test for AuctionRegistrar', async () => {  
        console.log("deploying WNSRegistry contract......")
        wns = await WNS.new({from: addrDeploy});

        console.log("deploying TestRegistrar contract......")
        auctionRegistrar = await AuctionRegistrar.new(wns.address, namehash('wan'), 0, {from:addrAuction});

        console.log("setting domain test to " + addrDeploy);
        await wns.setSubnodeOwner('0x0',web3.sha3('wan'), auctionRegistrar.address,{from: addrDeploy, gasPrice: 200000000000, gas:1000000})

        console.log("deploying PublicResolver contract......");
        publicResolver = await PublicResolver.new(wns.address, {from:addrDeploy});
        
        console.log("prepare process completed.");

        console.log("to registering myname.test to " + addrTest);
        await testRegistrar.register(web3.sha3('myname'), addrTest, {from: addrTest});

        mynameTestOwner = await wns.owner(namehash('myname.test'));
        console.log("name myname.test owner is: " + mynameTestOwner);
        await wns.setResolver(namehash('myname.test'), publicResolver.address, {from: addrTest});

        //        
        console.log("resolver will setting myname.test to address: " + addrTest);
        await publicResolver.setAddr(namehash('myname.test'), addrTest, {from: addrTest});
        console.log("get myname.test address: " + await getAddr("myname.test"));
        //assert.equal(await wns.owner(0), '0x77E00Ae5BFD8ba7Fc476Cf28448A9A521C8bf2de')

        //set sub node abcde.myname.test to addr
        console.log("setting sub node foo.myname.test to :" + addrAuction);
        await wns.setSubnodeOwner(namehash('myname.test'), web3.sha3('foo'), addrAuction, {from: addrTest}); 
        console.log("foo.myname.test owner is " + await wns.owner(namehash("foo.myname.test")));       
        await wns.setResolver(namehash('foo.myname.test'), publicResolver.address, {from: addrAuction});    
        await publicResolver.setAddr(namehash('foo.myname.test'), addrTest, {from: addrAuction});    
        assert.equal(await wns.owner(namehash('foo.myname.test')), addrAuction);
    });

    

    it('intergrate test for TestRegistrar', async () => {  
        console.log("deploying WNSRegistry contract......")
        wns = await WNS.new({from: addrDeploy});

        console.log("deploying TestRegistrar contract......")
        testRegistrar = await TestRegistrar.new(wns.address, namehash('test'), {from:addrTest});

        console.log("setting domain test to " + addrDeploy);
        await wns.setSubnodeOwner('0x0',web3.sha3('test'), testRegistrar.address,{from: addrDeploy, gasPrice: 200000000000, gas:1000000})

        console.log("deploying PublicResolver contract......");
        publicResolver = await PublicResolver.new(wns.address, {from:addrDeploy});
        
        console.log("prepare process completed.");
    
        console.log("to registering myname.test to " + addrTest);
        await testRegistrar.register(web3.sha3('myname'), addrTest, {from: addrTest});

        mynameTestOwner = await wns.owner(namehash('myname.test'));
        console.log("name myname.test owner is: " + mynameTestOwner);
        await wns.setResolver(namehash('myname.test'), publicResolver.address, {from: addrTest});

        //        
        console.log("resolver will setting myname.test to address: " + addrTest);
        await publicResolver.setAddr(namehash('myname.test'), addrTest, {from: addrTest});
        console.log("get myname.test address: " + await getAddr("myname.test"));
        //assert.equal(await wns.owner(0), '0x77E00Ae5BFD8ba7Fc476Cf28448A9A521C8bf2de')

        //set sub node abcde.myname.test to addr
        console.log("setting sub node foo.myname.test to :" + addrAuction);
        await wns.setSubnodeOwner(namehash('myname.test'), web3.sha3('foo'), addrAuction, {from: addrTest}); 
        console.log("foo.myname.test owner is " + await wns.owner(namehash("foo.myname.test")));       
        await wns.setResolver(namehash('foo.myname.test'), publicResolver.address, {from: addrAuction});    
        await publicResolver.setAddr(namehash('foo.myname.test'), addrTest, {from: addrAuction});    
        assert.equal(await wns.owner(namehash('foo.myname.test')), addrAuction);
    });
});
