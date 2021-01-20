// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

// Import the UsingWitnet library that enables interacting with Witnet
import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
// Import the BitcoinPrice request that you created before
import "./requests/BitcoinPrice.sol";

// Your contract needs to inherit from UsingWitnet
contract PriceFeed is UsingWitnet {
  uint64 public bitcoinPrice; // The public Bitcoin price point
  uint256 public lastRequestId;      // Stores the ID of the last Witnet request
  bool public pending;               // Tells if an update has been requested but not yet completed
  Request public request;            // The Witnet request object, is set in the constructor

  // emits when the price is updated
  event PriceUpdated(uint64);

  // emits when found an error decoding request result
  event ResultError(string);

  // This constructor does a nifty trick to tell the `UsingWitnet` library where
  // to find the Witnet contracts on whatever Ethereum network you use.
  constructor (address _wrb) public UsingWitnet(_wrb) {
    // Instantiate the Witnet request
    request = new BitcoinPriceRequest();
  }

  function requestUpdate(uint256 _witnetRequestReward, uint256 _witnetResultReward, uint256 _witnetBlockReward) public payable {
    require(!pending, "An update is already pending. Complete it first before requesting another update.");

    // Send the request to Witnet and store the ID for later retrieval of the result
    // The `witnetPostRequest` method comes with `UsingWitnet`
    lastRequestId = witnetPostRequest(request, _witnetRequestReward, _witnetResultReward, _witnetBlockReward);

    // Signal that there is already a pending request
    pending = true;
  }

  // The `witnetRequestAccepted` modifier comes with `UsingWitnet` and allows to
  // protect your methods from being called before the request has been successfully
  // relayed into Witnet.
  function completeUpdate() public witnetRequestAccepted(lastRequestId) {
    require(pending, "There is no pending update.");

    // Read the result of the Witnet request
    // The `witnetReadResult` method comes with `UsingWitnet`
    Witnet.Result memory result = witnetReadResult(lastRequestId);

    // If the Witnet request succeeded, decode the result and update the price point
    // If it failed, revert the transaction with a pretty-printed error message
    if (result.isOk()) {
      bitcoinPrice = result.asUint64();
      emit PriceUpdated(bitcoinPrice);
    } else {
      (, string memory errorMessage) = result.asErrorMessage();
      emit ResultError(errorMessage);
    }

    // In any case, set `pending` to false so a new update can be requested
    pending = false;
  }
}
