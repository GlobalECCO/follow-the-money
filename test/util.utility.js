var dollarfy = function (num) {
  //supports only whoel numbers
  num = parseInt(num) || 0;
  
  var negative = num < 0;
  num = Math.abs(num).toString();
  var numString = "";
  for (var i = num.length - 1, j = 0; i >= 0; i--, j++) {
    if (j===3) {
      numString = "," + numString;
      j = 0;
    }
    numString = num[i] + numString;
  }
  
  numString = "$" + numString;
  
  if (negative) {
    numString = "-" + numString;
  }
  return numString;
};