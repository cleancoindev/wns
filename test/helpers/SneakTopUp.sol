pragma solidity ^0.4.18;


contract SneakTopUp {
    address public holder;
    function SneakTopUp(address dest) public payable {
        holder = dest;
    }

    function killContract() public {    
        selfdestruct(holder);
    }
}
