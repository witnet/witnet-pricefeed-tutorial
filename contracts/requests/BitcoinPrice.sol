// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

// For the Witnet Request Board OVM-compatible (Optimism) "trustable" implementation (e.g. BOBA network),
// replace the next import line with:
// import "witnet-ethereum-bridge/contracts/impls/trustable/WitnetRequestBoardTrustableBoba.sol";
import "witnet-ethereum-bridge/contracts/impls/trustable/WitnetRequestBoardTrustableDefault.sol";
import "witnet-ethereum-bridge/contracts/requests/WitnetRequestInitializableBase.sol";

// The bytecode of the BitcoinPrice request that will be sent to Witnet
contract BitcoinPriceRequest is WitnetRequestInitializableBase {
  function initialize() public {
    WitnetRequestInitializableBase.initialize(hex"0ac90108a5b3cb8a06124a123a68747470733a2f2f6170692e62696e616e63652e636f6d2f6170692f76332f7469636b65722f70726963653f73796d626f6c3d425443555344541a0c8218778218646570726963651257123268747470733a2f2f6170692e6b72616b656e2e636f6d2f302f7075626c69632f5469636b65723f706169723d4254435553441a2185187782186666726573756c7482186668585842545a55534482186161618216001a0d0a0908051205fa3fc000001003220d0a0908051205fa3fc00000100310c0843d181920c0843d28333080c8afa025");
  }
}
