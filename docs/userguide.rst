**********
User Guide
**********

This user guide is intended for anyone wanting to register, configure, and update WNS names using a Javascript console and web3.js. Before starting, open up a geth console, download wnsutils.js_ or `wnsutils-testnet.js`_ to your local machine, and import it into a running Wanchain console:

::

    loadScript('/path/to/wnsutils.js');


.. _auctions:

Registering a name with the auction registrar
=============================================

Once deployed on mainnet, WNS names will be handed out via an auction process, on the '.wan' top-level domain. A preview of this is available on the testnet, and you can register names via it right now. 

This registrar implements a blind auction, and is described in EIP162_. Names are initially required to be at least 6 characters long(Which is different from ethereum 7 characters).

Registering a name with the auction registrar is a multi-step process.

Starting an auction
-------------------

Before placing a bid, you need to check if the name is available. Run this code to check:

::

    wanRegistrar.entries(web3.sha3('name'))[0];

This will return a single integer between 0 and 5. The full solidity data structure for this can be viewed `here <https://github.com/wanchain/wns/blob/master/contracts/Registrar.sol>`_ in the Registrar contract. The numbers represent different 'states' a name is currently in.

- 0 - Name is available and the auction hasn't started
- 1 - Name is available and the auction has been started
- 2 - Name is taken and currently owned by someone
- 3 - Name is forbidden
- 4 - Name is currently in the 'reveal' stage of the auction
- 5 - Name is not yet available due to the 'soft launch' of names.

If the returned value is `5`, and is in the 'soft launch' is in effect; you can check when it will be available for auction with:

::

    new Date(wanRegistrar.getAllowedTime(web3.sha3('name')) * 1000);


To start an auction for a name that's not already up for auction, call `startAuction`:

::

    wanRegistrar.startAuction(web3.sha3('name'), {from: eth.accounts[0], gas: 100000, gasPrice: 200000000000});

You can also start auctions for several names simultaneously, to disguise which name you're actually interested in registering:

::

    wanRegistrar.startAuctions([web3.sha3('decoy1'), web3.sha3('name'), web3.sha3('decoy2')], {from: eth.accounts[0], gas: 1000000, gasPrice: 200000000000});

Auctions normally run for 5 days: 3 days of bidding and 2 days of reveal phase. When initially deployed, there's a "soft start" phase during which names are released for bidding gradually; this soft start lasts 8 weeks on mainnet.

When a name is under auction, you can check the end time of the auction as follows:

::

    new Date(wanRegistrar.entries(web3.sha3('name'))[2].toNumber() * 1000)

Placing a bid
-------------

Bids can be placed at any time during an auction except in the last 48 hours (the 'reveal period'). Before trying to place a bid, make sure an auction is currently underway, as described above, and has more than 48 hours left to run.

To bid on an open auction, you need several pieces of data:

 - The name you want to register
 - The account you are sending the bid from
 - The maximum amount you're willing to pay for the name
 - A random 'salt' value

In addition, you need to decide how much WAN you want to deposit with the bid. This must be at least as much as the value of your bid, but can be more, in order to disguise the true value of the bid.

First, start by generating a secret value. An easy way to do this is to use random.org_. Store this value somewhere secure - if you lose it, you lose your deposit, and your chance at winning the auction!

Now, you can generate your 'sealed' bid, with the following code:

::

    var bid = wanRegistrar.shaBid(web3.sha3('name'), eth.accounts[0], web3.toWei(1), web3.sha3('secret'));

The arguments are, in order, the name you want to register, the account you are sending the bid from, your maximum bid, and the secret value you generated earlier. Note that the bidding account will become the owner. You will lose funds if you seal with one account and send the bid with another!

Next, submit your bid to the registrar:

::

    wanRegistrar.newBid(bid, {from: eth.accounts[0], value: web3.toWei(2), gas: 500000, gasPrice: 200000000000});

In the example above, we're sending 2 WAN, even though our maximum bid is 1 WAN; this is to disguise the true value of our bid. When we reveal our bid later, we will get the extra 1 WAN back; the most we can pay for the name is 1 WAN, as we specified when generating the bid.

Now it's a matter of waiting until the reveal period before revealing your bid. Run the command to check the expiration date of the auction again, and make sure to come back in the final 48 hours of the auction:

::

    new Date(wanRegistrar.entries(web3.sha3('name'))[2].toNumber() * 1000)

Revealing your bid
------------------

In order to win an auction, you must 'reveal' your bid. This is only possible during the 'reveal' phase, the last 48 hours of the auction, at which point new bids are prohibited. If you don't reveal your bid by the time the auction ends, your deposit is forfeit - so make sure you store your salt in a safe place, and come back before the auction ends in order to reveal your bid.

To reveal, call the `unsealBid` function with the same values you provided earlier:

::

    wanRegistrar.unsealBid(web3.sha3('name'), web3.toWei(1), web3.sha3('secret'), {from: eth.accounts[0], gas: 500000, gasPrice: 200000000000});

The arguments to `unsealBid` have the same order and meaning as those to `shaBid`, described in the bidding step, except that you don't need to supply the account - it's derived from your sending address.

After revealing your bid, the auction will be updated.

If your bid is less than a previously revealed bid, you will be refunded the whole amount of your bid.

If your bid is the largest revealed so far, you will be set as the current leading bidder. The difference between the actual amount of your bid and the amount you sent will be refunded immediately. The remainder - the actual bid - will stay locked. If you are later outbid it will be sent back to you.

Checking auctions
-----------------

At any time, you can check the current winning bidder with:

::

    deedContract.at(wanRegistrar.entries(web3.sha3('name'))[1]).owner();

and the value of the current winning bid with

::

    web3.fromWin(wanRegistrar.entries(web3.sha3('name'))[4]);

Finalizing the auction
----------------------

Once the auction has completed, it must be finalized in order for the name to be assigned to the winning bidder. Only the winning bidder can do this. To finalize, call the `finalizeAuction` function like so:

::

    wanRegistrar.finalizeAuction(web3.sha3('name'), {from: eth.accounts[0], gas: 500000, gasPrice: 200000000000});

Once called, the winning bidder will be refunded the difference between their bid and the next highest bidder. If you're the only bidder, you get back all but 0.01 wan of your bid. The winner is then assigned the name in WNS.

If you are the winning bidder, congratulations!

.. _managing-ownership:

Managing Ownership
------------------

After finalizing, your account now owns both the name in WNS and the deed in the Auction Registrar.

As the name owner, your account can manage the name using examples in "Interacting with the WNS registry". For example, you can use :code:`wns.setOwner` to transfer administration of the name to another account. The new name owner can manage that domain and all subdomains now. None of those actions affect your ownership of the deed.

As the deed owner, your account has the right to reset name ownership back to itself at any time, by using :code:`wanRegistrar.finalizeAuction` again. You can also choose to transfer the deed to another account with:

::

    wanRegistrar.transfer(web3.sha3('name'), newDeedOwnerAddress, {from: currentDeedOwnerAddress})

.. CAUTION::
   Transferring the deed is **irrevocable**. Be sure that you have verified the correct address for the new owner. Additionally, the wan you paid to win the auction will be transferred with the deed to the new owner.

.. _interacting:

Interacting with the WNS registry
=================================

The WNS registry forms the central component of WNS, mapping from hashed names to resolvers, as well as the owners of the names and their TTL (caching time-to-live).

Before you can make any changes to the WNS registry, you need to control an account that has ownership of a name in WNS. To obtain an WNS name on the testnet, see Quickstart.rst for '.test'. Names on '.test' are temporary, and can be claimed by someone else 28 days later.

Alternately, you can obtain a subdomain from someone else who owns a domain, or :doc:`deploying`. Note that while anyone can deploy their own WNS registry, those names will only be resolvable by users who reference that registry in their code.

Getting the owner of a name
---------------------------

You can retrieve the address of a name's owner using the `owner` function:

::

    > wns.owner(namehash('somename.wan'));
    "0x0000000000000000000000000000000000000000" in practice will show your setting address

Getting the resolver for a name
-------------------------------

You can retrieve the address of a name's resolver using the `resolver` function:

::

    > wns.resolver(namehash('somename.wan'));
    "0x0000000000000000000000000000000000000000"

Setting a name's resolver
-------------------------

You can set the resolver contract for a name using `setResolver`:

::

    > wns.setResolver(namehash('somename.wan'), resolverAddress, {from: eth.accounts[0]});

A resolver is any contract that implements the resolver interface specified in EIP137_. You can deploy your own resolver, or you can use a publicly available one; on the mainnet, a simple resolver that supports 'address' records and is usable by anyone is available; wnsutils.js exposes it as `publicResolver`. To use it, first set it as the resolver for your name:

::

    wns.setResolver(namehash('somename.wan'), publicResolver.address, {from: eth.accounts[0]});

Then, call the resolver's `setAddr` method to set the address the name resolves to:

::

    publicResolver.setAddr(namehash('somename.wan'), eth.accounts[0], {from: eth.accounts[0]})

The above example configures 'somename.wan' to resolve to the address of your primary account.

Transferring a name
-------------------

You can transfer ownership of a name you own in the WNS registry to another account using `setOwner`:

::

    > wns.setOwner(namehash('somename.wan'), newOwner, {from: eth.accounts[0]});

.. NOTE::

   If the name was acquired through a registrar, such as through a '.wan' auction process, this will not transfer ownership of the locked bid. It will also not perform any administrative tasks that a registrar might want to do.

   In general, to perform a complete transfer of a name acquired through a registrar, that particular registrar should be used as the interface. For the '.wan' registrar, see :ref:`managing-ownership`.

Creating a subdomain
--------------------

You can assign ownership of subdomains of any name you own with the `setSubnodeOwner` function. For instance, to create a subdomain 'foo.somename.wan' and set yourself as the owner:

::

    > wns.setSubnodeOwner(namehash('somename.wan'), web3.sha3('foo'), eth.accounts[0], {from: eth.accounts[0]});

Or, to assign someone else as the owner:

::

    > wns.setSubnodeOwner(namehash('somename.wan'), web3.sha3('foo'), someAccount, {from: eth.accounts[0]});

Note the use of `web3.sha3()` instead of `namehash()` when specifying the subdomain being allocated.

The owner of a name can reassign ownership of subdomains at any time, even if they're owned by someone else.

Resolving Names
---------------

Now you're ready to resolve your newly created name. For details how, read :ref:`resolving`.

Interacting with WNS from a DApp
--------------------------------
TODO: wanchain will provide wanchain-ens NPM module in the future
An NPM module, wanchain-ens_, is available to facilitate interacting with the WNS from Javascript-based DApps.

Interacting with WNS from a contract
------------------------------------

The `WNS registry interface`_ provides a Solidity definition of the methods available for interacting with the WNS. Using this, and the address of the WNS registry, contracts can read and write the WNS registry directly.

A Solidity library to facilitate this will be available soon.

.. _resolving:

Resolving WNS names
===================

This page describes how WNS name resolution works at the contract level. For convenient use in DApps, an NPM package, ethereum-ens_ is available which abstracts away much of the detail and makes name resolution a straightforward process.

Step by step
------------

Get the node ID (namehash output) for the name you want to resolve:

::

    var node = namehash('myname.wan');

Ask the WNS registry for the resolver responsible for that node:

::

    var resolverAddress = wns.resolver(node);

Create an instance of a resolver contract at that address:

::

    var resolver = resolverContract.at(resolverAddress);

Finally, ask the resolver what the address is:

::

    resolver.addr(node);

Oneliner
--------

This statement is equivalent to all of the above:

::

    resolverContract.at(wns.resolver(namehash('myname.wan'))).addr(namehash('myname.wan'));

For convenience, wnsutils.js provides a function, `getAddr` that does all of this for you with the default WNS registry:

::

    getAddr('myname.wan')

.. _reverse:

Reverse name resolution
=======================

WNS also supports reverse resolution of Wanchain addresses. This allows an account (contract or external) to associate metadata with itself, such as its canonical name - 'Wanchain caller ID' if you will.

Reverse records are in the format `<wanchain address>.addr.reverse` - for instance, the official registry would have its reverse records at `314159265dd8dbb310642f98f50c066173c1259b.addr.reverse`.

`addr.reverse` has a registrar with `claim`, `claimWithResolver`, and `setName` functions.

The claim function takes one argument, the Wanchain address that should own the reverse record.

This permits a very simple pattern for contracts that wish to delegate control of their reverse record to their creator; they simply need to add this function call to their constructor:

::

    reverseRegistrar.claim(msg.sender)

Claiming your account
---------------------

Call the `claim` function on the `reverseRegistrar` object:

::

    reverseRegistrar.claim(eth.accounts[0], {from: eth.accounts[0]});
    
After that transaction is mined, the appropriate reverse record is now owned by your account, and, you can deploy a resolver and set records on it; see :ref:`interacting` for details.

Alternately, you can claim and set the resolver record in one operation:

::

    reverseRegistrar.claimWithResolver(eth.accounts[0], reverseRegistrar.defaultResolver(), {from: eth.accounts[0]});

Setting up a reverse name for your address
------------------------------------------

If you just want to set up a reverse resolver with a name record, a quick convenience function is available in the reverse registrar:

::

    reverseRegistrar.setName('myname.wan', {from: eth.accounts[0]});

This function points your reverse record at a default resolver, then sets the name record on that resolver for you - everything you need to set up 'caller ID' in a single transaction.

.. _wanchain-ens: https://www.npmjs.com/package/wanchain-ens
.. _EIP137: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-137.md
.. _EIP162: https://github.com/ethereum/EIPs/issues/162
.. _wnsutils.js: https://github.com/wanchain/wns/blob/master/wnsutils.js
.. _wnsutils-testnet.js: https://github.com/wanchain/wns/blob/master/wnsutils-testnet.js
.. _random.org: https://www.random.org/strings/?num=1&len=20&digits=on&upperalpha=on&loweralpha=on&unique=off&format=html&rnd=new
