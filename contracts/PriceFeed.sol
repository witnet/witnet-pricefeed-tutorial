// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

// Import the UsingWitnet library that enables interacting with Witnet
import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
// Import the BitcoinPrice request that you created before
import "./requests/BitcoinPrice.sol";

// Your contract needs to inherit from UsingWitnet
contract PriceFeed is UsingWitnet {

    /// The public Bitcoin price point
    uint64 public lastPrice;

    /// Stores the ID of the last Witnet request
    uint256 public lastRequestId;

    /// Stores the timestamp of the last time the public price point was updated
    uint256 public timestamp;

    /// Tells if an update has been requested but not yet completed
    bool public pending;

    /// The Witnet request object, is set in the constructor, and initialized after deployment
    BitcoinPriceRequest public request;

    /// Emits when the price is updated
    event PriceUpdated(uint64);

    /// Emits when found an error decoding request result
    event ResultError(string);

    /// This constructor does a nifty trick to tell the `UsingWitnet` library where
    /// to find the Witnet contracts on whatever network you use.
    constructor (WitnetRequestBoard _wrb) UsingWitnet(_wrb) {
        // Instantiate the Witnet request
        request = new BitcoinPriceRequest();
        // Note: the request cannot be initialized here, as some EVM/OVM implementations 
        // may struggle with constructors containining arbitrary byte arrays or strings. 
    }

    /// This method initializes the actual Witnet request bytecode
    function initialize() external {
        request.initialize();
    }

    /// @notice Sends `request` to the WitnetRequestBoard.
    /// @dev This method will only succeed if `pending` is 0.
    function requestUpdate() public payable {
        require(!pending, "Complete pending request before requesting a new one");

        // Send the request to Witnet and store the ID for later retrieval of the result
        // The `_witnetPostRequest` method comes with `UsingWitnet`
        lastRequestId = _witnetPostRequest(request);

        // Signal that there is already a pending request
        pending = true;
    }

    /// @notice Reads the result, if ready, from the WitnetRequestBoard.
    /// @dev The `witnetRequestAccepted` modifier comes with `UsingWitnet` and allows to
    /// @dev protect your methods from being called before the request has been successfully
    /// @dev relayed into Witnet.
    function completeUpdate() public witnetRequestSolved(lastRequestId) {
        require(pending, "There is no pending update.");

        // Read the result of the Witnet request
        // The `_witnetReadResult` method comes with `UsingWitnet`
        Witnet.Result memory result = _witnetReadResult(lastRequestId);

        // If the Witnet request succeeded, decode the result and update the price point
        // If it failed, revert the transaction with a pretty-printed error message
        // `witnet.isOk()`, `witnet.asUint64()` and `witnet.asErrorMessage()` come with `UsingWitnet`
        if (witnet.isOk(result)) {
            lastPrice = witnet.asUint64(result);
            // solhint-disable-next-line not-rely-on-time
            timestamp = block.timestamp;
            emit PriceUpdated(lastPrice);
        } else {
            string memory errorMessage;

            // Try to read the value as an error message, catch error bytes if read fails
            try witnet.asErrorMessage(result) returns (Witnet.ErrorCodes, string memory e) {
                errorMessage = e;
            }
            catch (bytes memory errorBytes){
                errorMessage = string(errorBytes);
            }
            emit ResultError(errorMessage);
        }

        // In any case, set `pending` to false so a new update can be requested
        pending = false;
    }
}