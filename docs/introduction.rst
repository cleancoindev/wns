*******************
Introduction
*******************

WNS is the Wanchain Name Service, a distributed, open, and extensible naming system based on the Wanchain blockchain.

WNS can be used to resolve a wide variety of resources. The initial standard for WNS defines resolution for Wanchain addresses, but the system is extensible by design, allowing more resource types to be resolved in future without the core components of WNS requiring upgrades.

Overview
========

The primary goal of WNS is to resolve human-readable names, like 'jacklv.wan', into machine-readable identifiers, including Wanchain addresses and other identifiers. A secondary purpose is to provide metadata about names, such as ABIs for contracts, and whois information for users.

WNS has similar goals to DNS, the Internet's Domain Name Service, but has significantly different architecture, due to the capabilities and constraints provided by the blockchain. Like DNS, WNS operates on a system of dot-separated hierarchial names called domains, with the owner of a domain having full control over the distribution of subdomains. 

Top-level domains, like '.wan' and '.test' are owned by smart contracts called registrars, which specify rules governing the allocation of their subdomains. Anyone may, by following the rules imposed by these registrar contracts, obtain ownership of a second-level domain for their own use.

Architecture
============

WNS has two principal components: the registry, and resolvers.

The WNS registry consists of a single central contract that maintains a list of all domains and subdomains, and stores three critical pieces of information about each:

 - The owner of the domain
 - The resolver for the domain
 - The time-to-live for all records under the domain

The owner of a domain may be either an external account (a user) or a smart contract. A registrar is simply a smart contract that owns a domain, and issues subdomains of that domain to users that follow some set of rules defined in the contract.

Owners of domains in the WNS registry may:

 - Set the resolver and TTL for the domain
 - Transfer ownership of the domain to another address
 - Change the ownership of subdomains

The WNS registry is deliberately straightforward, and exists only to map from a name to the resolver responsible for it.

Resolvers are responsible for the actual process of translating names into addresses. Any contract that implements the relevant standards may act as a resolver in WNS. General-purpose resolver implementations are offered for users whose requirements are straightforward, such as serving an infrequently changed address for a name.

Each record type - Wanchain address,  and so forth - defines a method or methods that a resolver must implement in order to provide records of that kind. New record types may be defined at any time via the WIP standardisation process, with no need to make changes to the WNS registry or to existing resolvers in order to support them.

.. _namehash:

Namehash
========

Names in WNS are represented as 32 byte hashes, rather than as plain text. This simplifies processing and storage, while permitting arbitrary length domain names, and preserves the privacy of names onchain. The algorithm used to translate domain names into hashes is called namehash. Namehash is defined in EIP137_.

In order to preserve the hierarchal nature of names, namehash is defined recursively, making it possible to derive the hash of a subdomain from the hash of the parent domain and the name or hash of the subdomain.

Terminology
-----------

 - **domain** - the complete, human-readable form of a name; eg, `'alice.wallet.wan'`.
 - **label** - a single component of a domain; eg, `'alice'`, `'wallet'`, or `'wan'`. A label may not contain a period ('.').
 - **label hash** - the output of the keccak-256 function applied to a label; eg, `keccak256('wan') = 0x6b5a1f94cda084ab0a600e7af8d6c13e60a048e4fe826410acdfc02b4c76b15e`.
 - **node** - the output of the namehash function, used to uniquely identify a name in WNS.

Algorithm
---------

First, a domain is divided into labels by splitting on periods ('.'). So, 'alice.wallet.wan' becomes the list ['alice', 'wallet', 'wan'].

The namehash function is then defined recursively as follows:

::

    namehash([]) = 0x0000000000000000000000000000000000000000000000000000000000000000
    namehash([label, …]) = keccak256(namehash(…), keccak256(label))

A sample implementation in Python is provided below.

::

    def namehash(name):
      if name == '':
        return '\0' * 32
      else:
        label, _, remainder = name.partition('.')
        return sha3(namehash(remainder) + sha3(label))

WNS on Wanchain
===============

WNS is deployed on mainnet at TODO: 0x314159265dd8dbb310642f98f50c066173c1259b_, where users may register names under the wan TLD, which uses an auction based registrar.

WNS is also deployed on the testnet at TODO: 0x112234455c3a32fd11230c42e7bccd4a84e02010_. Users may register names under two top level domains:

 - .wan, which uses an auction based registrar with the same functionality as the main network, and allows users to keep names indefinitely; see Registrar.sol.
 - .test, which allows anyone to claim an unused name for test purposes, which expires after 28 days; see TestRegistrar.sol.


Resources
=========

 - EIP137_ - Ethereum Name Service
 - ethereum-ens_ Javascript library


 .. _0x112234455c3a32fd11230c42e7bccd4a84e02010: https://ropsten.etherscan.io/address/0x112234455c3a32fd11230c42e7bccd4a84e02010
 .. _EIP137: https://github.com/ethereum/EIPs/issues/137
 .. _EIP162: https://github.com/ethereum/EIPs/issues/162
 .. _ethereum-ens: https://www.npmjs.com/package/ethereum-ens
