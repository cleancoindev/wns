const WNS = artifacts.require('WNSRegistry.sol');
const AuctionRegistrar = artifacts.require('Registrar.sol');
const DeedContract = artifacts.require('Deed.sol');
const FIFS = artifacts.require('FIFSRegistrar.sol');
const PublicResolver = artifacts.require('PublicResolver.sol');
const ReverseResolver = artifacts.require('DefaultReverseResolver.sol');
const TestRegistrar = artifacts.require('TestRegistrar.sol');
const utils = require('./helpers/Utils.js');
const SneakTopUp = artifacts.require('./helpers/SneakTopUp.sol');


var assert = require('assert');
var async = require('async');
var Promise = require('bluebird');

// var utils = require('./utils.js');
// var web3 = utils.web3;

var accounts = null;

before(function(done) {
	web3.eth.getAccounts(function(err, acct) {
		accounts = acct
		done();
	});
});

function advanceTime(delay, done) {
	web3.currentProvider.sendAsync({
		jsonrpc: "2.0",
		"method": "evm_increaseTime",
		params: [delay]}, done)
}

function genNextBlock(){
    return new Promise((resolve, reject) => {
          web3.currentProvider.sendAsync({
            jsonrpc: '2.0', 
            method: 'evm_mine',
            params: [],
            id: new Date().getTime()
          }, function(err) {
            if (err) return reject(err);
            resolve();
          });
    });                
}


var advanceTimeAsync = Promise.promisify(advanceTime);

// days in secs
function days(numberOfDays) {
	return numberOfDays * 24 * 60 * 60;
}

function assertIsContractError(err) {
	return assert.ok(err.toString().indexOf("invalid JUMP") != -1, err);
}

describe('SimpleHashRegistrar', function() {
	var registrarABI = null;
	var registrarBytecode = null;
	var deedABI = null;
	var registrar = null;
	var ens = null;
	var throwingBidder = null;
	var launchLength = days(7 * 8);
	var bid;

	var dotEth = web3.sha3('0000000000000000000000000000000000000000000000000000000000000000' + web3.sha3('eth').slice(2), {encoding: 'hex'});
	var nameDotEth = web3.sha3(dotEth + web3.sha3('name').slice(2), {encoding: 'hex'});

	before(function() {
		// this.timeout(30000);
		// var code = utils.compileContract(['AbstractENS.sol', 'HashRegistrarSimplified.sol']);
		// registrarABI = JSON.parse(code.contracts['HashRegistrarSimplified.sol:Registrar'].interface);
		// registrarBytecode = code.contracts['HashRegistrarSimplified.sol:Registrar'].bytecode;
		// deedABI = JSON.parse(code.contracts['HashRegistrarSimplified.sol:Deed'].interface);
	});

	beforeEach(async () => {
		this.timeout(5000);
		ens = await WNS.new();
		registrar = await AuctionRegistrar.new(ens.address, dotEth, 0, {from: accounts[0], gas: 4700000});
		await ens.setSubnodeOwner(0, web3.sha3('eth'), registrar.address, {from: accounts[0]});
	});

	it('starts auctions', async () => {
		await advanceTimeAsync(launchLength);
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
		await advanceTimeAsync(days(2));
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});

		var result = await registrar.entries(web3.sha3('name'));

		assert.equal(result[0], 1); // status == Auction
		assert.equal(result[1], 0); // deed == 0x00
		// Expected to end 5 days from start
		var expectedEnd = new Date().getTime() / 1000 + launchLength + days(5);
		//assert.ok(Math.abs(result[2].toNumber() - expectedEnd) < 5); // registrationDate
		assert.equal(result[3], 0); // value = 0
		assert.equal(result[4], 0); // highestBid = 0

		await advanceTimeAsync(days(30));
		await registrar.startAuction(web3.sha3('anothername'), {from: accounts[0]});
		result = await registrar.entries(web3.sha3('anothername'));
		var expectedEnd = new Date().getTime() / 1000 + launchLength + days(37);
		//assert.ok(Math.abs(result[2].toNumber() - expectedEnd) < 5); // registrationDate
	});

	it('launch starts slow with scheduled availability', async () => {
		var registryStarted = 0;
		var result = await registrar.registryStarted();
		registryStarted = Number(result);
		result = await registrar.getAllowedTime('0x00');
		assert.equal(Number(result) , registryStarted);

		result = await registrar.getAllowedTime('0x80');
		assert.equal(Number(result)-registryStarted , launchLength/2);

		result = await registrar.getAllowedTime('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
		assert.equal(Number(result)-registryStarted , launchLength-1);

		result = await registrar.getAllowedTime(web3.sha3('ethereum'));
		assert.equal(Math.round((Number(result)-registryStarted)/days(1)), 18);

		await advanceTimeAsync(days(1));

		result = await registrar.startAuction(web3.sha3('freedomhacker'), {from: accounts[0]});
		assert.ok(result != null);

		await registrar.startAuction(web3.sha3('ethereum'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });

		await registrar.startAuction(web3.sha3('unicorn'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });

		result = await registrar.entries(web3.sha3('freedomhacker'));
		assert.equal(result[0], 1);

		result = await registrar.entries(web3.sha3('ethereum'));
		assert.equal(result[0], 5); 

		result = await registrar.entries(web3.sha3('unicorn'));
		assert.equal(result[0], 5);

		await advanceTimeAsync(days(30));

		await registrar.startAuction(web3.sha3('ethereum'), {from: accounts[0]});

		result = await registrar.entries(web3.sha3('freedomhacker'));
		assert.equal(result[0], 0);

		result = await registrar.entries(web3.sha3('ethereum'));
		assert.equal(result[0], 1); 

		result = await registrar.entries(web3.sha3('unicorn'));
		assert.equal(result[0], 5); 

		await advanceTimeAsync(days(60));

		await registrar.startAuction(web3.sha3('unicorn'), {from: accounts[0]});

		result = await registrar.entries(web3.sha3('unicorn'));
		assert.equal(result[0], 1); 
	});

    it('records bids', async () => {	
    	bid = null;
    	await advanceTimeAsync(launchLength);

    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});

    	bid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 0);
    	await registrar.newBid(bid, {from: accounts[0], value: 2e18}).catch((error) => { utils.ensureException(error); });

    	deedAddress = await registrar.sealedBids(accounts[0], bid);
    	balance = await web3.eth.getBalance(deedAddress);
    	assert.equal(balance.toNumber(), 2e18);

    	await registrar.newBid(bid, {from: accounts[0], value: 1e15 - 1}).catch((error) => { utils.ensureException(error); });
    });

    it('concludes auctions', async () => {
		this.timeout(5000);
		var bidData = [
			// A regular bid
			{description: 'A regular bid', account: accounts[0], value: 1.1e18, deposit: 2.0e18, salt: 1, expectedFee: 0.005 },
			// A better bid
			{description: 'Winning bid', account: accounts[1], value: 2.0e18, deposit: 2.0e18, salt: 2, expectedFee: 0.75 },
			// Lower, but affects second place
			{description: 'Losing bid that affects price', account: accounts[2], value: 1.5e18, deposit: 2.0e18, salt: 3, expectedFee: 0.005 },
			// No effect
			{description: 'Losing bid that doesn\'t affect price', account: accounts[3], value: 1.2e18, deposit: 2.0e18, salt: 4, expectedFee: 0.005 },
			// Deposit smaller than value
			{description: 'Bid with deposit less than claimed value', account: accounts[4], value: 5.0e18, deposit: 1.0e17, salt: 5, expectedFee: 0.005 },
			// Invalid - doesn't reveal
			{description: 'Bid that wasn\'t revealed in time', account: accounts[5], value: 1.4e18, deposit: 2.0e18, salt: 6, expectedFee: 0.995 }
		];

        // moves past the soft launch dates
		await advanceTimeAsync(launchLength);

        // Save initial balances
		for(var bid of bidData) {
			balance = await web3.eth.getBalance(bid.account);
			bid.startingBalance = balance.toFixed();
		}

		// Start an auction for 'name'
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});

		result = await registrar.entries(web3.sha3('name'));
		// Should be status 1 (Auction)
		assert.equal(result[0], 1);

		// Place each of the bids
		for(var bid of bidData) {
			bid.sealedBid = await registrar.shaBid(web3.sha3('name'), bid.account, bid.value, bid.salt);
			txid = await registrar.newBid(bid.sealedBid, {from: bid.account, value: bid.deposit});
		}

		// Try to reveal a bid early
		await registrar.unsealBid(web3.sha3('name'), bidData[0].value, bidData[0].salt, {from: bidData[0].account}).catch((error) => { utils.ensureException(error); });

		// Advance 3 days to the reveal period
		await advanceTimeAsync(days(3) + 60);		

		// force time update
		await genNextBlock();

		// checks status
		result = await registrar.entries(web3.sha3('name'));
		// Should be status 4 (Reveal)
		assert.equal(result[0], 4);

		// Reveal all the bids
		for (var bid of bidData){
			if(bid.salt !== 6){
				txid = await registrar.unsealBid(web3.sha3('name'), bid.value, bid.salt, {from: bid.account});
			}
		}

		// Advance another two days to the end of the auction
		await advanceTimeAsync(days(2)+20);
		// force time update
		await genNextBlock();

		//Reveal last bid
		bid = bidData[5];
		await registrar.unsealBid(web3.sha3('name'), bid.value, bid.salt, {from: bid.account}).catch((error) => { utils.ensureException(error); });

		// Finalize the auction	
		txid = await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[1]});

		// Check the name has the correct owner, value, and highestBid
		result = await registrar.entries(web3.sha3('name'));
		assert.equal(result[0], 2); // status == Owned
		assert.equal(result[3], 1.5e18); // value = 1.5 ether
		assert.equal(result[4], 2e18); // highestBid = 2 ether
		var deed = DeedContract.at(result[1]);
		// Check the owner is correct
		var addr = await deed.owner();
		assert.equal(addr, accounts[1]);
		// Check the registrar is correct
		addr = await deed.registrar();
		assert.equal(addr, registrar.address);
		// Check the balance is correct
		balance = await web3.eth.getBalance(result[1]);
		assert.equal(balance.toNumber(), bidData[2].value);
		// Check the value is correct
		value = await deed.value();
		assert.equal(value, bidData[2].value);

		// Check balances
		for (var bid of bidData){
			balance = await web3.eth.getBalance(bid.account);
			var spentFee = Math.floor(10000*(bid.startingBalance - balance.toFixed()) / Math.min(bid.value, bid.deposit))/10000;
			//console.log('\t Bidder #' + bid.salt, bid.description + '. Spent:', 100*spentFee + '%; Expected:', 100*bid.expectedFee + '%;');
			assert.equal(spentFee, bid.expectedFee);
		}

		// Check the owner is set in ENS
		let owner = await ens.owner(nameDotEth);
		assert.equal(owner, accounts[1]);


		// 	// Check balances
		// 	function(done) {
		// 		async.each(bidData, function(bid, done) {
		// 			web3.eth.getBalance(bid.account, function(err, balance){
		// 				var spentFee = Math.floor(10000*(bid.startingBalance - balance.toFixed()) / Math.min(bid.value, bid.deposit))/10000;
		// 				console.log('\t Bidder #' + bid.salt, bid.description + '. Spent:', 100*spentFee + '%; Expected:', 100*bid.expectedFee + '%;');
		// 				assert.equal(spentFee, bid.expectedFee);
		// 				done();
		// 			});
		// 		}, done);
		// 	},
    });

	it('cancels bids', async () => {
		this.timeout(5000);
		var bidData = [
			// A regular bid
			{description: 'A regular bid 1', account: accounts[0], value: 1.5e18, deposit: 2.0e18, salt: 1, expectedFee: 0.005 },
			{description: 'A regular bid 2', account: accounts[1], value: 1.1e18, deposit: 2.0e18, salt: 1, expectedFee: 0.005 },
			{description: 'A regular bid 3', account: accounts[2], value: 1.1e18, deposit: 2.0e18, salt: 1, expectedFee: 0.005 },
		];

		// moves past the soft launch dates
		await advanceTimeAsync(launchLength);
		// Start an auction for 'cancelname'
		await registrar.startAuction(web3.sha3('cancelname'), {from: accounts[0]});
		// Place each of the bids
		for (var bid of bidData){
			result = await registrar.shaBid(web3.sha3('cancelname'), bid.account, bid.value, bid.salt);
			bid.sealedBid = result;
			txid = await registrar.newBid(bid.sealedBid, {from: bid.account, value: bid.deposit});
		}
		// Attempt to cancel the first bid and fail
		bid = bidData[0];
		result = await registrar.shaBid(web3.sha3('cancelname'), bid.account, bid.value, bid.salt);
		bid.sealedBid = result;
		await registrar.cancelBid(bid.account, bid.sealedBid, {from: bid.account}).catch((error) => { utils.ensureException(error); });
		result = await registrar.sealedBids(bid.account, bid.sealedBid)
		assert.notEqual(result, 0);

		// Advance 3 days to the reveal period
		await advanceTimeAsync(days(3) + 60);
		// Get the bid
		bid = bidData[1];
		result = await registrar.shaBid(web3.sha3('cancelname'), bid.account, bid.value, bid.salt);
		bid.sealedBid = result;
		// Attempt to cancel the second bid and fail
		await registrar.cancelBid(bid.account, bid.sealedBid, {from: bid.account}).catch((error) => { utils.ensureException(error); });
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.notEqual(result, 0);
		// Checks the bid exists
		bid = bidData[1];
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.notEqual(result, '0x0000000000000000000000000000000000000000');
		// Reveal the second bid
		bid = bidData[1];
		await registrar.unsealBid(web3.sha3('cancelname'), bid.value, bid.salt, {from: bid.account});
		// Checks the bid doesn't exist anymore
		bid = bidData[1];
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.equal(result, '0x0000000000000000000000000000000000000000');

		// Attempt to cancel the second bid and fail
		bid = bidData[1];
		bid.sealedBid = await registrar.shaBid(web3.sha3('cancelname'), bid.account, bid.value, bid.salt);
		// Checks the bid exists
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.equal(result, '0x0000000000000000000000000000000000000000');
		// Cancels the bid
		await registrar.cancelBid(bid.account, bid.sealedBid, {from: bid.account}).catch((error) => { utils.ensureException(error); });
		// Checks that it does not exist now
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.equal(result, '0x0000000000000000000000000000000000000000');
		// Advance another two days to the end of the auction
		await advanceTimeAsync(days(2));
		// Finalize the auction and get the deed address
		result = await registrar.finalizeAuction(web3.sha3('cancelname'), {from: accounts[1]});
		await registrar.entries(web3.sha3('cancelname'));
		// Attempt to cancel the third bid and fail
		bid = bidData[2];
		bid.sealedBid = await registrar.shaBid(web3.sha3('cancelname'), bid.account, bid.value, bid.salt);
		// Bid should exist
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.notEqual(result, '0x0000000000000000000000000000000000000000');
		// should give an error
		await registrar.cancelBid(bid.account, bid.sealedBid, {from: bid.account}).catch((error) => { utils.ensureException(error); });
		// Bid should still exist
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.notEqual(result, '0x0000000000000000000000000000000000000000');
		// Advance 8 weeks
		await advanceTimeAsync(8 * days(7));
		// Bid should exist
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.notEqual(result, 0);
		// should NOT give an error
		await registrar.cancelBid(bid.account, bid.sealedBid, {from: bid.account});
		// Bid should not exist anymore
		result = await registrar.sealedBids(bid.account, bid.sealedBid);
		assert.equal(result, 0);
		// Attempt to cancel again and fail
		bid = bidData[2];
		bid.sealedBid = await registrar.shaBid(web3.sha3('cancelname'), bid.account, bid.value, bid.salt);
		await registrar.cancelBid(bid.account, bid.sealedBid, {from: bid.account}).catch((error) => { utils.ensureException(error); });
	});

    it('releases deed after one year', async () => {
		let sealedBid = null;
		let winnerBalance = 0;
		let owner = accounts[1];
		let notOwner = accounts[0];

		await advanceTimeAsync(launchLength);
		await registrar.startAuction(web3.sha3('name'), {from: owner});
		result = await registrar.shaBid(web3.sha3('name'), notOwner, 1e18, 1);
		sealedBid = result;
		await registrar.newBid(result, {from: notOwner, value: 1e18});
		result = await registrar.shaBid(web3.sha3('name'), owner, 2e18, 2);
		sealedBid = result;
		await registrar.newBid(result, {from: owner, value: 2e18});
		await advanceTimeAsync(days(3) + 60);
		await genNextBlock();
		await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: notOwner});
		await registrar.unsealBid(web3.sha3('name'), 2e18, 2, {from: owner});
		await advanceTimeAsync(days(2) + 60);
		await registrar.finalizeAuction(web3.sha3('name'), {from: owner}).catch((error) => { utils.ensureException(error); });
		// Cannot release early
		await registrar.releaseDeed(web3.sha3('name'), {from: owner}).catch((error) => { utils.ensureException(error); });
		await advanceTimeAsync(days(366) + 60);
		// Other user cannot release it
		await registrar.releaseDeed(web3.sha3('name'), {from: notOwner}).catch((error) => { utils.ensureException(error); });

		winnerBalance = (await web3.eth.getBalance(owner)).toFixed();
		await registrar.releaseDeed(web3.sha3('name'), {from: owner});
		// Name should be available
		result = await registrar.entries(web3.sha3('name'));
		assert.equal(result[0], 0);

		balance = await web3.eth.getBalance(owner);
		let returnedEther = web3.fromWei(Number(balance.toFixed() - winnerBalance), 'ether');
		assert.equal(1 - returnedEther < 0.01, true);

		await registrar.releaseDeed(web3.sha3('name'), {from: owner}).catch((error) => { utils.ensureException(error); });
		// force time update 
		await genNextBlock();
		// Check we can start an auction on the newly released name	
		await registrar.startAuction(web3.sha3('name'), {from: owner});
		result = await registrar.entries(web3.sha3('name'));
		assert.equal(result[0], 1);
    });

    it('allows releasing a deed immediately when no longer the registrar', async () => {
    	let sealedBid = null;
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});
    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});
    	await advanceTimeAsync(days(2) + 60);
    	await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]});
    	await ens.setSubnodeOwner(0, web3.sha3('eth'), accounts[0], {from: accounts[0]});
    	await registrar.releaseDeed(web3.sha3('name'), {from: accounts[0]});
    });

    it('rejects bids less than the minimum', async () => {
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	result = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e15 - 1, 1);
    	await registrar.newBid(result, {from: accounts[0], value: 1e18});
    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('name'), 1e15 - 1, 1, {from: accounts[0]});
    	result = await registrar.entries(web3.sha3('name'));
    	assert.equal(result[4], 0);
    });

    it("doesn't allow finalizing an auction early", async () => {
    	var sealedBid = null;
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]})
        await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
        sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
        await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});

        await advanceTimeAsync(days(3) + 60);
        await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
        await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });

        await advanceTimeAsync(days(2) + 60)
        await genNextBlock();
        await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[1]}).catch((error) => { utils.ensureException(error); });
        await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]});
    });

    it("allows finalizing an auction even when no longer the registrar", async () => {
    	var sealedBid = null;
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});

    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});

    	await advanceTimeAsync(days(2) + 60);
        await genNextBlock();

        await ens.setSubnodeOwner(0, web3.sha3('eth'), accounts[0], {from: accounts[0]});
        await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]});
    });

    it("doesn't allow revealing a bid on a name not up for auction", async () => {
    	var sealedBid = null;
    	await advanceTimeAsync(launchLength);
    	sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18}).catch((error) => { utils.ensureException(error); });    	
    	await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
    	await advanceTimeAsync(days(1));
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});
    });

    it("doesn't invalidate long names", async () => {
    	var sealedBid = null;
    	await advanceTimeAsync(launchLength);
        await registrar.startAuction(web3.sha3('longname'), {from: accounts[0]});
    	sealedBid = await registrar.shaBid(web3.sha3('longname'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});

    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('longname'), 1e18, 1, {from: accounts[0]});

    	await advanceTimeAsync(days(2) + 60);
        await genNextBlock();
        await registrar.finalizeAuction(web3.sha3('longname'), {from: accounts[0]});
        await registrar.invalidateName('longname', {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
    });

    it("allows invalidation even when no longer the registrar", async () => {
    	var sealedBid = null;
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});

    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});

    	await advanceTimeAsync(days(2) + 60);
    	await genNextBlock();

    	await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]});
    	await ens.setSubnodeOwner(0, web3.sha3('eth'), accounts[0], {from: accounts[0]});
    	await registrar.invalidateName('name', {from: accounts[0]});
    });

    it('calling startAuction on a finished auction has no effect', async () => {
    	var auctionStatus = null;
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});

    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});
    	auctionStatus = await registrar.entries(web3.sha3('name'));

    	await advanceTimeAsync(days(2) + 60);
        await genNextBlock();

        await registrar.startAuction(web3.sha3('name'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
        result = await registrar.entries(web3.sha3('name'));
        assert.deepEqual(result[1], auctionStatus[1]);
        console.log("result " + result);
        console.log("auction Status:" + auctionStatus);
    });

    it('takes the max of declared and provided value', async () => {
    	await advanceTimeAsync(launchLength);
    	await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	result = await registrar.shaBid(web3.sha3('name'), accounts[0], 2e18, 1);
    	await registrar.newBid(result, {from: accounts[0], value: 1e18});
    	result = await registrar.shaBid(web3.sha3('name'), accounts[1], 4e18, 1);
    	await registrar.newBid(result, {from: accounts[1], value: 3e18});

    	await advanceTimeAsync(days(3) + 60);
    	await genNextBlock();
    	// Reveal the bids and check they're processed correctly.
    	await registrar.unsealBid(web3.sha3('name'), 2e18, 1, {from: accounts[0]});
    	result = await registrar.entries(web3.sha3('name'));
		assert.equal(result[3], 0);
		assert.equal(result[4], 1e18);

		await registrar.unsealBid(web3.sha3('name'), 4e18, 1, {from: accounts[1]});
		result = await registrar.entries(web3.sha3('name'));
		assert.equal(result[3], 1e18);
		assert.equal(result[4], 3e18);
    });

    it('invalidates short names', async () => {
		bid = {account: accounts[0], value: 1.5e18, deposit: 2e18, salt: 1, description: 'bidded before invalidation' };
		let invalidator = {account: accounts[2]};
		// Store balances
		balance = await web3.eth.getBalance(bid.account);
		bid.startingBalance = balance.toFixed();

		balance = await web3.eth.getBalance(invalidator.account);
		invalidator.startingBalance = balance.toFixed();

    	await advanceTimeAsync(launchLength);
    	// Start some auctions
    	await registrar.startAuctions([web3.sha3('name'), web3.sha3('longname'), web3.sha3('thirdname')], {from: accounts[0]});
    	bid.sealedBid = await registrar.shaBid(web3.sha3('name'), bid.account, bid.value, bid.salt);
    	await registrar.newBid(bid.sealedBid, {from: bid.account, value: bid.deposit});

        // Advance time to the reveal period
    	await advanceTimeAsync(days(3) + 60);
    	// Reveal the bid
    	await registrar.unsealBid(web3.sha3('name'), bid.value, bid.salt, {from: bid.account});

    	await advanceTimeAsync(days(2) + 60);
    	// Invalidate the name
    	await registrar.invalidateName('name', {from: invalidator.account});
    	// Check it was invalidated
    	entry = await registrar.entries(web3.sha3('name'));
    	assert.equal(entry[0], 0);
    	// Check account balances
    	balance = await web3.eth.getBalance(bid.account);
    	var spentFee = Math.floor(web3.fromWei(bid.startingBalance - balance.toFixed(), 'finney'));
    	console.log('\t Bidder #'+ bid.salt, bid.description, 'spent:', spentFee, 'finney;');
    	assert.equal(spentFee, 5);

    	balance = await web3.eth.getBalance(invalidator.account);
		let fee = Math.floor(web3.fromWei(balance.toFixed() - invalidator.startingBalance, 'finney'));
		// console.log('\t Invalidator got: ', fee, 'finney');
		assert.equal(fee, 4);
		owner = await ens.owner(nameDotEth);
		assert.equal(owner, 0);
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    });

    it('zeroes ENS records on invalidation', async () => {
    	let bid = {account: accounts[0], value: 1.5e18, deposit: 2e18, salt: 1, description: 'bidded before invalidation' };
		let invalidator = {account: accounts[2]};
		await advanceTimeAsync(launchLength);
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
    	bid.sealedBid = await registrar.shaBid(web3.sha3('name'), bid.account, bid.value, bid.salt);
    	await registrar.newBid(bid.sealedBid, {from: bid.account, value: bid.deposit});

		// Advance time and reveal the bid
		await advanceTimeAsync(days(3) + 60);
		await registrar.unsealBid(web3.sha3('name'), bid.value, bid.salt, {from: bid.account});

		// Advance time and finalise the auction
		await advanceTimeAsync(days(2) + 60);
		await registrar.finalizeAuction(web3.sha3('name'), {from: bid.account});

		// Set the resolver record in ENS
		await ens.setResolver(nameDotEth, accounts[0], {from: bid.account});
		// Invalidate the name
    	await registrar.invalidateName('name', {from: invalidator.account});
    	// Check owner and resolver are both zeroed
    	owner = await ens.owner(nameDotEth);
    	assert.equal(owner, 0);
    	resolver = await ens.resolver(nameDotEth);
    	assert.equal(resolver, 0);
    });

    it('supports transferring deeds to another registrar', async () => {
		var bidData = [
			{account: accounts[0], value: 1e18, deposit: 2e18, salt: 1},
		];
		var deedAddress = null;
		var newRegistrar = null;

		// Advance past soft launch
		await advanceTimeAsync(launchLength + 60);
		// Start an auction for 'name'
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});

		// Place each of the bids
    	result = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(result, {from: accounts[0], value: 2e18});
    	// Advance time and reveal the bid
		await advanceTimeAsync(days(3) + 60);
		await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});
		// Advance another two days to the end of the auction
		await advanceTimeAsync(days(2));
		// Finalize the auction and get the deed address
		await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]});
		result = await registrar.entries(web3.sha3('name'));
		deedAddress = result[1];

		// Transferring the deed should fail
		registrar.transferRegistrars(web3.sha3('name'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
		// Deploy a new registrar
		newRegistrar = await AuctionRegistrar.new(ens.address, dotEth, 0, {from: accounts[0], gas: 4700000});
		// Update ENS with a new registrar
		await ens.setSubnodeOwner(0, web3.sha3('eth'), newRegistrar.address, {from: accounts[0]});
		// Transfer the deed
		await registrar.transferRegistrars(web3.sha3('name'), {from: accounts[0]});
		// Check the deed was transferred as expected
		owner = await DeedContract.at(deedAddress).registrar();
		assert.equal(newRegistrar.address, owner);

		// Check the record is unset on the old registrar
		entry = await registrar.entries(web3.sha3('name'));
		assert.equal(entry[0], 0);
		assert.equal(entry[1], 0);
		assert.equal(entry[2], 0);
		assert.equal(entry[3], 0);
		assert.equal(entry[4], 0);
    });

    it('supports transferring domains to another account', async () =>{
		var bidData = [
			{account: accounts[0], value: 1e18, deposit: 2e18, salt: 1},
		];
		var deedAddress = null;
    	await advanceTimeAsync(launchLength);
    	// Start an auction for 'name'
		await registrar.startAuction(web3.sha3('name'), {from: accounts[0]});
		// Place each of the bids
    	sealedBid = await registrar.shaBid(web3.sha3('name'), accounts[0], 1e18, 1);
    	await registrar.newBid(sealedBid, {from: accounts[0], value: 2e18});

        await advanceTimeAsync(days(3) + 60);
        // Reveal the bid
		await registrar.unsealBid(web3.sha3('name'), 1e18, 1, {from: accounts[0]});    	

		// Make sure we can't transfer it yet
		await registrar.transfer(web3.sha3('name'), accounts[1], {from: accounts[0]}).catch((error) => { utils.ensureException(error); });

		// Advance another two days to the end of the auction
		await advanceTimeAsync(days(2));
		// Finalize the auction and get the deed address
		await registrar.finalizeAuction(web3.sha3('name'), {from: accounts[0]});
		result = await registrar.entries(web3.sha3('name'));
		deedAddress = result[1];
		// Try and transfer it when we don't own it
		await registrar.transfer(web3.sha3('name'), accounts[1], {from: accounts[1]}).catch((error) => { utils.ensureException(error); });
		// Transfer ownership to another account
		await registrar.transfer(web3.sha3('name'), accounts[1], {from: accounts[0]});
		// Check the new owner was set on the deed
		owner = await DeedContract.at(deedAddress).owner();
		assert.equal(accounts[1], owner);
		// Check the new owner was set in ENS
		owner = await ens.owner(nameDotEth);
		assert.equal(accounts[1], owner);
    });

    it('prohibits late funding of bids', async () => {
		bid = {account: accounts[0], value: 1.3e18, deposit: 1.0e18, salt: 1, description: 'underfunded bid' };
		let bidWinner = {account: accounts[1], value: 1.2e18, deposit: 1.6e18, salt: 1, description: 'normally funded bid' };
		let deedAddress = null;

		await advanceTimeAsync(launchLength);
		// Save initial balances
		balance = await web3.eth.getBalance(bid.account);
		bid.startingBalance = balance.toFixed();
		// Start auction
		await registrar.startAuction(web3.sha3('longname'), {from: accounts[0]});
		// Place the underfunded bid
		bid.sealedBid = await registrar.shaBid(web3.sha3('longname'), bid.account, bid.value, bid.salt)
		await registrar.newBid(bid.sealedBid, {from: bid.account, value: bid.deposit});
		// Place the normal bid
		bidWinner.sealedBid = await registrar.shaBid(web3.sha3('longname'), bidWinner.account, bidWinner.value, bidWinner.salt);
		await registrar.newBid(bidWinner.sealedBid, {from: bidWinner.account, value: bidWinner.deposit});
		// Advance 3 days to the reveal period
		await advanceTimeAsync(days(3) + 60);
		// Reveal the normal bid
		await registrar.unsealBid(web3.sha3('longname'), bidWinner.value, bidWinner.salt, {from: bidWinner.account});

		// Sneakily top up the bid
		deedAddress = await registrar.sealedBids(bid.account, bid.sealedBid);
		contract = await  SneakTopUp.new(deedAddress,
					    {
					    	from: accounts[0],
					     	gas: 4700000,
					     	value: 2e18,
					   	});
		if(contract.address != undefined) {
			await contract.killContract();
			balance = await web3.eth.getBalance(deedAddress).toNumber();
			assert.equal(balance, 3000000000000000000);
		}

		// Reveal the underfunded bid
		await registrar.unsealBid(web3.sha3('longname'), bid.value, bid.salt, {from: bid.account});
		// Check balance
		balance = await web3.eth.getBalance(bid.account);
        var spentFee = Math.floor(web3.fromWei(bid.startingBalance - balance.toFixed(), 'finney'));
		console.log('\t Bidder #'+ bid.salt, bid.description, 'spent:', spentFee, 'finney;');
		// Bid is considered equal to 1 ether and loses, costing 0.5%
		assert.equal(spentFee, 5);		

		// Advance another two days to the end of the auction
		await advanceTimeAsync(days(2));
		// Finalize the auction and get the deed address
		await registrar.finalizeAuction(web3.sha3('longname'), {from: bidWinner.account});
		result = await registrar.entries(web3.sha3('longname'));
		deedAddress = result[1];
		// Check the new owner was set on the deed
		owner = await DeedContract.at(deedAddress).owner();
		assert.equal(accounts[1], owner);
    });


    it('prohibits bids during the reveal period', async () => {
    	bid = {account: accounts[0], value: 1.5e18, deposit: 1e17, salt: 1, description: 'underfunded bid' };
    	await advanceTimeAsync(launchLength);
		// Save initial balances
		balance = await web3.eth.getBalance(bid.account);
		bid.startingBalance = balance.toFixed();
		// Start auction
		await registrar.startAuction(web3.sha3('longname'), {from: accounts[0]});
		// Advance 3 days to the reveal period
		await advanceTimeAsync(days(3) + 60);
		// Place the underfunded bid
		bid.sealedBid = await registrar.shaBid(web3.sha3('longname'), bid.account, bid.value, bid.salt)
		await registrar.newBid(bid.sealedBid, {from: bid.account, value: bid.deposit});
		// Reveal the bid
		await registrar.unsealBid(web3.sha3('longname'), bid.value, bid.salt, {from: bid.account});
		result = await registrar.entries(web3.sha3('longname'));
		assert.equal(result[1], "0x0000000000000000000000000000000000000000");
    });

    it("prohibits starting auctions when it's not the registrar", async () => {
		bid = {account: accounts[0], value: 1e18, deposit: 2e18, salt: 1};
		var deedAddress = null;
		var newRegistrar = null;
    	await advanceTimeAsync(launchLength);
    	// Start an auction for 'name'
    	await ens.setSubnodeOwner(0, web3.sha3('eth'), accounts[0], {from: accounts[0]});
    	registrar.startAuction(web3.sha3('name'), {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
    });

    it("permits anyone to zero out ENS records not associated with an owned name", async () => {
    	var subdomainDotNameDotEth = web3.sha3(nameDotEth + web3.sha3('subdomain').slice(2), {encoding: 'hex'});
    	await ens.setSubnodeOwner(0, web3.sha3('eth'), accounts[0], {from: accounts[0]});
    	await ens.setSubnodeOwner(dotEth, web3.sha3('name'), accounts[0], {from: accounts[0]});
		await ens.setSubnodeOwner(nameDotEth, web3.sha3('subdomain'), accounts[0], {from: accounts[0]});
		await ens.setResolver(nameDotEth, accounts[0], {from: accounts[0]});
		await ens.setResolver(subdomainDotNameDotEth, accounts[0], {from: accounts[0]});
		// Set the registrar as the owner of .eth again
		await ens.setOwner(dotEth, registrar.address, {from: accounts[0]});
		// Call the eraseNode method
		await registrar.eraseNode([web3.sha3("subdomain"), web3.sha3("name")], {from: accounts[1]});
		// Check that the owners and resolvers have all been set to zero
		var resolver = await ens.resolver(subdomainDotNameDotEth);
		assert.equal(resolver, 0)
		var owner = await ens.owner(subdomainDotNameDotEth);
		assert.equal(owner, 0)
		resolver = await ens.resolver(nameDotEth);
		assert.equal(resolver, 0);
		owner = await ens.owner(nameDotEth);
		assert.equal(owner, 0)
    });

    it("does not permit owned names to be zeroed", async () => {
    	var sealedBid = null;
		await advanceTimeAsync(launchLength);
		await registrar.startAuction(web3.sha3('longname'), {from: accounts[0]});
		sealedBid = await registrar.shaBid(web3.sha3('longname'), accounts[0], 1e18, 1);
		await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});

		await advanceTimeAsync(days(3) + 60);
		await registrar.unsealBid(web3.sha3('longname'), 1e18, 1, {from: accounts[0]});
		await advanceTimeAsync(days(2) + 60);
		await registrar.finalizeAuction(web3.sha3('longname'), {from: accounts[0]});
		await registrar.eraseNode([web3.sha3("longname")], {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
    });

    it("does not permit an empty name to be zeroed", async() => {
    	await registrar.eraseNode([], {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
    });

    it("does not allow bidders to replay others' bids", async() => {
		var sealedBid = null;
		await advanceTimeAsync(launchLength);

		await registrar.startAuction(web3.sha3('longname'), {from: accounts[0]});
		sealedBid = await registrar.shaBid(web3.sha3('longname'), accounts[1], 1e18, 1);
		await registrar.newBid(sealedBid, {from: accounts[0], value: 1e18});
		await advanceTimeAsync(days(3) + 60);
		await registrar.unsealBid(web3.sha3('longname'), 1e18, 1, {from: accounts[0]}).catch((error) => { utils.ensureException(error); });
    });
});
