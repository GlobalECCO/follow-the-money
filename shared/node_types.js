/*******************************************************************************
 * An enum representing the possible transaction types a node can represent
 ******************************************************************************/
this.NodeTypes = {
  INVALID: 'Invalid',
  FUNDER: 'Funder', // The starting point of the network
  BANK: 'Bank',
  HAWALA: 'Hawala',
  TERRORIST: 'Terrorist', // An endpoint of the network
  LEADER: 'Leader', // The Terrorist Leader
  UNSUB: 'Unidentified Suspect' //a suspect that hasn't been undiscovered yet
}
