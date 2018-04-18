pragma solidity ^0.4.18;

import './WNS.sol';

/**
 * A registrar that allocates subdomains to the first person to claim them.
 */
contract FIFSRegistrar {
    WNS wns;
    bytes32 rootNode;

    modifier only_owner(bytes32 subnode) {
        address currentOwner = wns.owner(keccak256(rootNode, subnode));
        require(currentOwner == 0 || currentOwner == msg.sender);
        _;
    }

    /**
     * Constructor.
     * @param wnsAddr The address of the WNS registry.
     * @param node The node that this registrar administers.
     */
    function FIFSRegistrar(WNS wnsAddr, bytes32 node) public {
        wns = wnsAddr;
        rootNode = node;
    }

    /**
     * Register a name, or change the owner of an existing registration.
     * @param subnode The hash of the label to register.
     * @param owner The address of the new owner.
     */
    function register(bytes32 subnode, address owner) public only_owner(subnode) {
        wns.setSubnodeOwner(rootNode, subnode, owner);
    }
}
