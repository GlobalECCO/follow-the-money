/*******************************************************************************
 * An enum representing the statuses money can have
 ******************************************************************************/
this.AgentStatus = {
  INVALID: 'Invalid',
  FOCUSING: 'Focusing', // Currently looking for suspicious transactions
  FOLLOWING: 'Following', // Currently following some money
  FREEZING: 'Freezing', // Currently freezing some money in place
  LOCKDOWN: 'Lockdown', // Currently locking down a Hawala node
  INCAPACITATED: 'Incapacitated', // This agent is currently incapacitated
}
