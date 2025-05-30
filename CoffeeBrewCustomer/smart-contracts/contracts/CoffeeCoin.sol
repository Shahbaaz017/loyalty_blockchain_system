// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // For owner-only functions

// Using OpenZeppelin's ERC20 preset for a standard token
// And Ownable for access control (e.g., only owner can mint)
contract CoffeeCoin is ERC20, Ownable {
    constructor(address initialOwner) ERC20("CoffeeCoin", "CFC") Ownable(initialOwner) {
        // The 'initialOwner' will be the deployer of the contract
        // No initial supply minted at deployment in this version,
        // owner will mint as needed.
    }

    // Function to allow the owner to mint new tokens
    // 'to' is the address that will receive the tokens
    // 'amount' is the number of tokens to mint (in the smallest unit, like wei for Ether)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Function to allow users (or the program on their behalf) to burn (destroy) their tokens
    // This would be used when redeeming rewards
    // 'amount' is the number of tokens to burn from the caller's balance
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    // (Optional) Override decimals if you want something other than the default 18
    // Loyalty points often don't need many decimal places. Let's use 0 for whole points.
    function decimals() public view virtual override returns (uint8) {
        return 0; // Our CoffeeCoins are whole units
    }

    // (Optional) Consider if transfers between users should be allowed.
    // For many loyalty programs, transfers are disabled.
    // To disable transfers, you could override _beforeTokenTransfer and revert if sender/receiver are not specific addresses/zero address for mint/burn.
    // For now, we'll leave standard ERC20 transferability.
}
