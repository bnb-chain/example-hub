// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PingPong {
  uint256 public pingCount;
  uint256 public pongCount;

  enum LastMove {
    None,
    Ping,
    Pong
  }
  LastMove public lastMove = LastMove.None;

  event Pinged(address indexed sender, uint256 pingCount, uint256 timestamp);
  event Ponged(address indexed sender, uint256 pongCount, uint256 timestamp);

  error InvalidMove(string reason);

  function ping() external {
    if (lastMove == LastMove.Ping)
      revert InvalidMove("Cannot ping twice in a row");

    pingCount += 1;
    lastMove = LastMove.Ping;

    emit Pinged(msg.sender, pingCount, block.timestamp);
  }

  function pong() external {
    if (lastMove != LastMove.Ping) revert InvalidMove("Must ping before pong");

    pongCount += 1;
    lastMove = LastMove.Pong;

    emit Ponged(msg.sender, pongCount, block.timestamp);
  }

  function getGameStatus()
    external
    view
    returns (uint256 totalPings, uint256 totalPongs, string memory nextMove)
  {
    totalPings = pingCount;
    totalPongs = pongCount;

    if (lastMove == LastMove.None || lastMove == LastMove.Pong) {
      nextMove = "ping";
    } else {
      nextMove = "pong";
    }
  }
}
