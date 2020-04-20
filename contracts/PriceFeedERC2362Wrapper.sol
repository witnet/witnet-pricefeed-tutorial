pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "adomedianizer/contracts/IERC2362.sol";
import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
import "./PriceFeed.sol";
import "./requests/BitcoinPrice.sol";

/**
* @title A thin ERC2362 compliant wrapper around Witnet's basic BTC/USD price feed example.
* @notice This keeps a reference to an already existing instance of the `PriceFeed` contract, keeps track of when it was
* updated for the last time, and exposes the value as provided for by ERC2362.
**/
contract PriceFeedERC2362Wrapper is UsingWitnet, IERC2362 {
  address public inner;
  uint256 public timestamp;

  // This is `keccak256("Price-BTC/USD-3")`
  bytes32 constant public BTCUSD3ID = bytes32(hex"637b7efb6b620736c247aaa282f3898914c0bef6c12faff0d3fe9d4bea783020");

  /**
  * @notice Constructs the contract by storing the address to the existing `PriceFeed` contract it is wrapping.
  **/
  constructor (address _wrb, address _priceFeed) UsingWitnet(_wrb) public {
    inner = _priceFeed;
  }

  /**
  * @notice Wraps the `requestUpdate` function from the inner `PriceFeed` contract. Additionally, if the request is
  * submitted successfully, it refunds any value remainder to the transaction initiator.
  **/
  function requestUpdate() external payable {
    // Call `requestUpdate()` in the inner contract.
    PriceFeed(inner).requestUpdate();
    // Refund any value remainder to the transaction initiator.
    msg.sender.transfer(address(this).balance);
  }

  /**
  * @notice Wraps the `completeUpdate` function from the inner `PriceFeed` contract and keeps track of when it was
  * updated for the last time. Note however that calling the `completeUpdate()` function directly on the inner
  * contract will go unnoticed by this wrapper contract. As a consequence, the poller script for the price feed should
  * always call this method and not the inner one.
  **/
  function completeUpdate() external {
    PriceFeed innerContract = PriceFeed(inner);
    // Call `completeUpdate()` in the inner contract.
    innerContract.completeUpdate();
    // Set the timestamp of the latest successful completion.
    if (witnetReadResult(innerContract.lastRequestId()).isOk()) {
      timestamp = block.timestamp;
    }
  }

  /**
  * @notice Exposes the public data point from the inner `PriceFeed` contract in an ERC2362 compliant way.
  * @dev Returns error `400` if queried for an unknown data point, and `404` if `completeUpdate` has never been called
  * successfully before.
  **/
  function valueFor(bytes32 _id) external view override returns(int256, uint256, uint256) {
    // Unsupported data point ID
    if(_id != BTCUSD3ID) return(0, 0, 400);
    // No value is yet available for the queried data point ID
    if (timestamp == 0) return(0, 0, 404);

    int256 value = int256(PriceFeed(inner).bitcoinPrice());

    return(value, timestamp, 200);
  }
}
