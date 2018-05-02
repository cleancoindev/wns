const WNS = artifacts.require('WNSRegistry.sol');
const AuctionRegistrar = artifacts.require('./helpers/MockRegistrar.sol');
const DeedContract = artifacts.require('Deed.sol');
const FIFS = artifacts.require('FIFSRegistrar.sol');
const PublicResolver = artifacts.require('PublicResolver.sol');
const ReverseRegistrar = artifacts.require('ReverseRegistrar.sol');
const ReverseResolver = artifacts.require('DefaultReverseResolver.sol');
const TestRegistrar = artifacts.require('TestRegistrar.sol');

const utils = require('./helpers/Utils.js');
const namehash = require('eth-ens-namehash');

var awaitSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

var accounts = null;

before(function(done) {
    web3.eth.getAccounts(function(err, acct) {
        accounts = acct
        done();
    });
});


/*
personal.unlockAccount(eth.accounts[0], 'wanchain', 999999);
personal.unlockAccount(eth.accounts[1], 'wanchain', 999999);
personal.unlockAccount(eth.accounts[2], 'wanchain', 999999);
personal.unlockAccount(eth.accounts[3], 'wanchain', 999999);
*/

contract('ENS', function (accounts) {
    let addrDeploy = accounts[0];
    let addrFoundation = accounts[1];
    let addrAuction = accounts[2];
    let addrTest = accounts[3]

    let wns;
    let testRegistrar;
    let wanRegistrar;
    let publicResolver;

    async function getAddr(name) {
        var node = namehash(name)
        var resolverAddress = await wns.resolver(node);
        if (resolverAddress === '0x0000000000000000000000000000000000000000') {
            return resolverAddress;
        }
        return await PublicResolver.at(resolverAddress).addr(node);
    }        

    before(async () => {        
        wns = await WNS.new({from: addrDeploy});        
        console.log("deploying WNSRegistry contract at: " + wns.address);
        
        publicResolver = await PublicResolver.new(wns.address, {from:addrDeploy});  
        console.log("deploying PublicResolver contract at: " + publicResolver.address);    

        reverseResolver = await ReverseResolver.new(wns.address, {from:addrDeploy});
        reverseRegistrar = await ReverseRegistrar.new(wns.address, reverseResolver.address, {from:addrDeploy});
    });

    it('intergrate test for TestRegistrar', async function () {          
        this.timeout(30*60*1000);
        testRegistrar = await TestRegistrar.new(wns.address, namehash('test'), {from:addrTest});
        console.log("deploying TestRegistrar contract at:" + testRegistrar.address);

        console.log("setting domain \'test\' to " + addrDeploy);
        await wns.setSubnodeOwner('0x0',web3.sha3('test'), testRegistrar.address,{from: addrDeploy})

        console.log("prepare process completed.");
    
        console.log("to registering myname.test to " + addrTest);
        await testRegistrar.register(web3.sha3('myname'), addrTest, {from: addrTest});

        mynameTestOwner = await wns.owner(namehash('myname.test'));
        assert.equal(await mynameTestOwner, addrTest);
        console.log("name myname.test owner is: " + mynameTestOwner);
        await wns.setResolver(namehash('myname.test'), publicResolver.address, {from: addrTest});

        //        
        console.log("resolver will setting myname.test to address: " + addrTest);
        await publicResolver.setAddr(namehash('myname.test'), addrTest, {from: addrTest});
        console.log("get myname.test address: " + await getAddr("myname.test"));

        //set sub node abcde.myname.test to addr
        console.log("setting sub node foo.myname.test to :" + addrAuction);
        await wns.setSubnodeOwner(namehash('myname.test'), web3.sha3('foo'), addrAuction, {from: addrTest}); 
        console.log("foo.myname.test owner is " + await wns.owner(namehash("foo.myname.test")));       
        await wns.setResolver(namehash('foo.myname.test'), publicResolver.address, {from: addrAuction});    
        await publicResolver.setAddr(namehash('foo.myname.test'), addrTest, {from: addrAuction});    
        assert.equal(await wns.owner(namehash('foo.myname.test')), addrAuction);
    });    
    
    
    it('integrate test for AuctionRegistrar', async function ()  {
        // all await sleep time according to mock contract
        this.timeout(60*60*1000);

        console.log("deploying AuctionRegistrar contract......")
        wanRegistrar = await AuctionRegistrar.new(wns.address, namehash('wan'), 0, {from:addrAuction});

        console.log("setting domain test to " + addrDeploy);
        await wns.setSubnodeOwner('0x0',web3.sha3('wan'), wanRegistrar.address,{from: addrDeploy});

        await wns.setSubnodeOwner(0, web3.sha3('reverse'), addrDeploy, {from: addrDeploy});
        await wns.setSubnodeOwner(namehash('reverse'), web3.sha3('addr'), reverseRegistrar.address, {from: addrDeploy});

        console.log("waiting wanRegistrar lanuching all time");
        await awaitSleep(100*1000);

        /* force time update when using ganache */
        await web3.eth.sendTransaction({from:addrTest, to: addrDeploy, value: web3.toWei(1), gasPrice: 200000000000});

        
        console.log("prepare process completed.");
        destDomain = 'jacklv';
        result = await wanRegistrar.entries(web3.sha3(destDomain));
        console.log(result);
        assert.equal(result[0].toNumber(), 0);

        console.log("start auction...");
        await wanRegistrar.startAuction(web3.sha3(destDomain), {from: addrFoundation});

        console.log("new bid...");
        var bid = await wanRegistrar.shaBid(web3.sha3(destDomain), addrFoundation, web3.toWei(1), web3.sha3('secret'));
        await wanRegistrar.newBid(bid, {from: addrFoundation, value: web3.toWei(2, 'ether')});
        await awaitSleep(3*60*1000);

        console.log("unseal Bid...");
        await wanRegistrar.unsealBid(web3.sha3(destDomain), web3.toWei(1, 'ether'), web3.sha3('secret'), {from: addrFoundation});
        await awaitSleep(2*60*1000);

        var entry = await wanRegistrar.entries(web3.sha3(destDomain));
        deed = DeedContract.at(entry[1]);
        destDomainOwner = await deed.owner();
        console.log("domain jacklv.wan owner is: " + destDomainOwner);
        console.log("foundation address is: " +  addrFoundation);

        console.log("finalize auction ...");
        await wanRegistrar.finalizeAuction(web3.sha3(destDomain), {from: addrFoundation});

        await reverseRegistrar.setName('jacklv.wan', {from: addrFoundation});
        console.log("reverse" + await reverseResolver.name(await reverseRegistrar.node(addrFoundation)));
    });
});
