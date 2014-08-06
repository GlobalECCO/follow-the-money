/*******************************************************************************
 * An enum representing the statuses money can have
 ******************************************************************************/
this.MoneyStatus = {
  INVALID: 'Invalid',
  FAKE: 'Fake', // Fake money generated for the State's benefit
  NEW: 'New', // The money's initial route just got set
  MOVING: 'Moving', // The money is moving down the network
  WAITING: 'Waiting', // The money is waiting on its current node
  SPOTTED: 'Spotted', // A State Agent spotted the money
  FREEZING: 'Freezing', // The State submitted a freeze on the money
  FROZEN: 'Frozen', // The money is being held by an agent for the current turn
  DEPOSITED: 'Deposited' // The money reached its destination
}
