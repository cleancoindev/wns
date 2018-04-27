***************
Deploying WNS
***************

If you'd like to deploy WNS on your own network, or deploy your own copy of WNS on a public or testnet network, this guide shows you how. If you want to use an existing WNS deployment, read :ref:`interacting` instead..

Deploy the registry
-------------------

First, you need to deploy WNS's central component, the registry. To do so, paste this code into an Wanchain console:

::

    var wnsContract = web3.eth.contract([{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"resolver","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"label","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setSubnodeOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"ttl","type":"uint64"}],"name":"setTTL","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"ttl","outputs":[{"name":"","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"resolver","type":"address"}],"name":"setResolver","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"node","type":"bytes32"},{"indexed":true,"name":"label","type":"bytes32"},{"indexed":false,"name":"owner","type":"address"}],"name":"NewOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"node","type":"bytes32"},{"indexed":false,"name":"owner","type":"address"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"node","type":"bytes32"},{"indexed":false,"name":"resolver","type":"address"}],"name":"NewResolver","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"node","type":"bytes32"},{"indexed":false,"name":"ttl","type":"uint64"}],"name":"NewTTL","type":"event"}]);
    var wns = wnsContract.new({
        from: web3.eth.accounts[0],
        data: "0x6060604052341561000f57600080fd5b336000808060010260001916815260200190815260200160002060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506108c0806100796000396000f300606060405260043610610083576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680630178b8bf1461008857806302571be3146100ef57806306ab59231461015657806314ab9038146101a957806316a25cbd146101e35780631896f70a146102325780635b0fc9c314610278575b600080fd5b341561009357600080fd5b6100ad6004808035600019169060200190919050506102be565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b34156100fa57600080fd5b610114600480803560001916906020019091905050610305565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b341561016157600080fd5b6101a76004808035600019169060200190919080356000191690602001909190803573ffffffffffffffffffffffffffffffffffffffff1690602001909190505061034c565b005b34156101b457600080fd5b6101e160048080356000191690602001909190803567ffffffffffffffff169060200190919050506104c6565b005b34156101ee57600080fd5b6102086004808035600019169060200190919050506105d7565b604051808267ffffffffffffffff1667ffffffffffffffff16815260200191505060405180910390f35b341561023d57600080fd5b61027660048080356000191690602001909190803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610612565b005b341561028357600080fd5b6102bc60048080356000191690602001909190803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610753565b005b6000806000836000191660001916815260200190815260200160002060010160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b6000806000836000191660001916815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b6000833373ffffffffffffffffffffffffffffffffffffffff16600080836000191660001916815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161415156103c657600080fd5b848460405180836000191660001916815260200182600019166000191681526020019250505060405180910390209150836000191685600019167fce0457fe73731f824cc272376169235128c118b49d344817417c6d108d155e8285604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390a382600080846000191660001916815260200190815260200160002060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505050505050565b813373ffffffffffffffffffffffffffffffffffffffff16600080836000191660001916815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614151561053e57600080fd5b82600019167f1d4f9bbfc9cab89d66e1a1562f2233ccbf1308cb4f63de2ead5787adddb8fa6883604051808267ffffffffffffffff1667ffffffffffffffff16815260200191505060405180910390a281600080856000191660001916815260200190815260200160002060010160146101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550505050565b6000806000836000191660001916815260200190815260200160002060010160149054906101000a900467ffffffffffffffff169050919050565b813373ffffffffffffffffffffffffffffffffffffffff16600080836000191660001916815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614151561068a57600080fd5b82600019167f335721b01866dc23fbee8b6b2c7b1e14d6f05c28cd35a2c934239f94095602a083604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390a281600080856000191660001916815260200190815260200160002060010160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550505050565b813373ffffffffffffffffffffffffffffffffffffffff16600080836000191660001916815260200190815260200160002060000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161415156107cb57600080fd5b82600019167fd4735d920b0f87494915f556dd9b54c8f309026070caea5c737245152564d26683604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390a281600080856000191660001916815260200190815260200160002060000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505050505600a165627a7a7230582060131dc17ae2eb41ac8ccf266a6b126549a8567d29357bed50e20d3981125f790029",
        gas: 4700000,
        gasPrice: 200000000000 
    }, function (e, contract){
        console.log(e, contract);
        if (typeof contract.address !== 'undefined') {
             console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
        }
    });


Once successfully mined, you will have a fresh WNS registry, whose root node is owned by the account that created the transaction (in this case, the first account on your node). This account has total control over the WNS registry - it can create and replace any node in the entire tree.

For instructions on how to interact with the registry, see :ref:`interacting`.

Deploying a registrar
---------------------

A registrar is a contract that has ownership over a node (name) in the WNS registry, and provides an interface for users to register subnodes (subdomains). You can deploy a registrar on any name; in this example we'll deploy a simple first-in-first-served registrar for the root node.

To deploy a first-in-first-served registrar on the root node of an WNS registry you control, execute this code in an Wanchain console:

::

    var registrarContract = web3.eth.contract([{"constant":true,"inputs":[],"name":"wns","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"expiryTimes","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"subnode","type":"bytes32"},{"name":"owner","type":"address"}],"name":"register","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"rootNode","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"wnsAddr","type":"address"},{"name":"node","type":"bytes32"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"}]);
    var registrar = registrarContract.new(
        wns.address,
        0,
        0,
        {from: web3.eth.accounts[0],
        data: "0x6060604052341561000f57600080fd5b6040516040806103b083398101604052808051906020019091908051906020019091905050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600181600019169055505050610320806100906000396000f300606060405260043610610062576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063910c970114610067578063af9f26e4146100bc578063d22057a9146100f7578063faff50a81461013d575b600080fd5b341561007257600080fd5b61007a61016e565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b34156100c757600080fd5b6100e1600480803560001916906020019091905050610193565b6040518082815260200191505060405180910390f35b341561010257600080fd5b61013b60048080356000191690602001909190803573ffffffffffffffffffffffffffffffffffffffff169060200190919050506101ab565b005b341561014857600080fd5b6101506102ee565b60405180826000191660001916815260200191505060405180910390f35b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60026020528060005260406000206000915090505481565b42600260008460001916600019168152602001908152602001600020541015156101d457600080fd5b6224ea004201600260008460001916600019168152602001908152602001600020819055506000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166306ab592360015484846040518463ffffffff167c010000000000000000000000000000000000000000000000000000000002815260040180846000191660001916815260200183600019166000191681526020018273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019350505050600060405180830381600087803b15156102d657600080fd5b6102c65a03f115156102e757600080fd5b5050505050565b600154815600a165627a7a72305820fb8e58e33aa3654f5bf371727cc419cef1b43d73272bd2f39e891799fab112e30029",
        gas: 4700000,
        gasPrice: 200000000000 
    }, function (e, contract){
        console.log(e, contract);
        if (typeof contract.address !== 'undefined') {
             console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
        }
    });

Once that transaction is mined, you can transfer ownership of the root node to the newly created registrar:

::

    wns.setOwner(0, registrar.address, {from: web3.eth.accounts[0]});

Users can now register names with the registrar;
