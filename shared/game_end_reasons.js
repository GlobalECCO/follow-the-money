/*******************************************************************************
 * An enum representing the ways a game can end
 ******************************************************************************/
this.GameEndReason = {
  UNDECIDED: 'Undecided', // The game has not ended yet
  STATE_CHOSE_WISELY: 'State Chose Wisely', // State successfully accused the leader
  STATE_CHOSE_POORLY: 'State Chose Poorly', // State accused a minion
  TERRORIST_FUNDED: 'Terrorist Funded', // Terrorist successfully funded the leader
  TERRORIST_LEADER_BROKE: 'Terrorist Leader Broke', // The terrorist leader is broke
  TERRORIST_MINIONS_BROKE: 'Terrorist Minions Broke', // The terrorist minions are broke
  TERRORIST_RAN_OUT_OF_MONEY: 'Terrorist Ran Out Of Money', // The terrorist ran out of money
}
