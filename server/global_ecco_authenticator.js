/*******************************************************************************
 * Facilitates communication between CAS, EGS, and us
 ******************************************************************************/
module.exports = {
  authenticate_with_cas: authenticate_with_cas,
  getPlayerProfile: getPlayerProfile,
  sendPlayerUpdate: sendPlayerUpdate,
  sendEGSUpdate: sendEGSUpdate
};

var cas = require('cas');
var http_request = require('request');
var GameEndReason = require('../shared/game_end_reasons.js').GameEndReason;
var GamePhase = require('../shared/game_phase.js').GamePhase;
var Util = require('./game_logic/util.js');
var log = require('./log').log;

var CAS_HOST = process.env.CAS_HOST || "cas.nps.edu/ecco";
var CAS_URL = process.env.CAS_URL || "https://" + CAS_HOST + "/login";
var EGS_HOST = process.env.EGS_HOST || 'test.globalecco.org';
var EGS_PORT = process.env.EGS_PORT || 443;
var EGS_PROTOCOL = 'https';
var EGS_USERNAME = process.env.EGS_USERNAME || 'games@globalecco.org';
var EGS_PASSWORD = process.env.EGS_PASSWORD || 'farkle54';
var EGS_PROFILE_PATH = process.env.EGS_PROFILE_PATH || "/api/secure/jsonws/egs-portlet.gamingprofile/get";
var EGS_NOTIFICATION_PATH = process.env.EGS_NOTIFICATION_PATH || "/api/secure/jsonws/egs-portlet.gamebot";
var use_ssl = false;

var GAME_TITLE = "ftm";
var GAME_VERSION = "1";

//------------------------------------------------------------------------------
// Given a valid email address (returned via CAS) ask the ECCO Game Server for
// this user's gaming ID (nickname).
// @param cas_handle The player's email
// @param game_id The generated Game ID
// @callback The function to call when finished
function getPlayerProfile(cas_handle, game_id, callback) {
  var profile_endpoint = EGS_PROFILE_PATH
  var path = EGS_PROFILE_PATH+"?ver="+GAME_VERSION+"&title="+GAME_TITLE+"&gid="+encodeURIComponent(game_id)+"&email="+encodeURIComponent(cas_handle);

  var auth = (EGS_USERNAME && EGS_PASSWORD) ? (encodeURIComponent(EGS_USERNAME)+":"+EGS_PASSWORD+"@") : "";
  var url = EGS_PROTOCOL + "://"+auth+EGS_HOST+":"+EGS_PORT+path;

  var opts = {
    url: url,
    method: 'GET'
  };

  http_request(opts, function(error, response, body) {
    if (error) {
      log.error("Error getting gaming profile from EGS. Error: " + error);
      callback("Unable to retrieve gaming profile for "+cas_handle);
      return;
    }
    if (response.statusCode !== 200) {
      log.error("Error getting gaming profile from EGS. Response code: " + (response.statusCode || 'none') );
      log.error(body);
      callback("Unable to retrieve gaming profile for "+cas_handle);
      return;
    }

  /*
     {
       "gameInstanceId": "xxx",
       "gamingId":"xxxxxxx",
       "casId": "some email address"
     }
  */
    log.info(body);
    var responseJSON = JSON.parse(body);
    if (responseJSON.exception) {
      callback(responseJSON.exception, null);
    } else {
      callback(null, responseJSON);
    }
    return;
  });
}

//------------------------------------------------------------------------------
// Perform the authentication with CAS. Also validate the CAS-returned
// token is valid.
// The supplied callback will trigger when completed.
function authenticate_with_cas(request, response, callback) {

  var serviceTicket = request.query.ticket;
  var hasServiceTicket = typeof serviceTicket !== 'undefined';

  var host = CAS_HOST;
  var cas_url = CAS_URL;
  var SERVICE_URL = process.env.SERVICE_URL; //  ebr 8/22

  var protocol = use_ssl ? "https://" : "http://";
  var path = request.url.replace(/[&|\?]?ticket=[\w|-]+/i, "");
  var hostname = SERVICE_URL + path; //ebr
  // ebr var hostname = protocol + request.headers.host + path;
  var loginUrl = cas_url + '?service=' + encodeURIComponent(hostname);

  var base_url = "https://"+host;

  var casInstance = new cas({
    base_url: base_url,
    service: hostname,
    https: {
      rejectUnauthorized: false
    }
  });

  // initial visit
  if (!hasServiceTicket) {
    //Redirecting to CAS Login
    response.redirect(loginUrl);
    return;
  }

  // validate service ticket
  casInstance.validate(serviceTicket, function(error, status, cas_handle) {
  //Validated ticket
  if (error) {
    log.error("Error validating CAS: ", error);
  }
  if (error || !status) {
    response.redirect(loginUrl);
    return;
  }
  callback(cas_handle);
  });
}

//------------------------------------------------------------------------------
// Sends an updated game status to the EGS server.
// @param[in]  rpcIndex A unique RPC index.
// @param[in]  game     The game data.
function sendEGSUpdate(rpcIndex, game) {
  var path = EGS_NOTIFICATION_PATH;

  var auth = (EGS_USERNAME && EGS_PASSWORD) ? (encodeURIComponent(EGS_USERNAME)+":"+EGS_PASSWORD+"@") : "";
  var url = EGS_PROTOCOL + "://"+auth+EGS_HOST+":"+EGS_PORT+path;
  //log.debug('EGS Update Url:' + url);

  var body = {
    "method": "game-updates",
    "id": rpcIndex,
    "jsonrpc": "2.0",
    "params": {
      "payload": {
        "update": []
      }
    }
  };

  sendPlayerUpdate(body.params.payload.update, game, game.getCurrentTurn());

  var opts = {
    url: url,
    method: 'POST',
    headers: { "Content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };

  //log.debug('sending this to EGS: ' + opts.body);

  http_request(opts, function(error, response, body) {
    if (error) {
      log.error("Error sending update to EGS. Error: " + error);
      return;
    }
    if (response.statusCode !== 200) {
      log.error("Error sending update to EGS. Response code: " + (response.statusCode || 'none') );
      log.error(body);
      return;
    }

    //log.debug("Response from EGS (status:"+response.statusCode+"): " + body);
    //TODO parse the body and handle any issues contained within
    //{"Status":[["Game instance not found"],["Game instance not found"]],"okay":0,"fail":2}
    return;
  });
}

//------------------------------------------------------------------------------
// Adds updates to the update_list for each player
// @param[in]  update_list  The list to add updates to.
// @param[in]  game     The game data.
// @param[in]  turn     The turn data.
function sendPlayerUpdate(update_list, game, turnData) {

  //state player
  var playerState = "ATTN";
  if (turnData.statePlayer.pendingTurn !== null || game.getCurrentTurn().phase === GamePhase.ENDGAME) {
    playerState = "PEND";
  }

  var outcome = "NA";
  if (game.getCurrentTurn().phase === GamePhase.ENDGAME) {
    if (Util.didStatePlayerWin(game.getCurrentTurn())) {
      outcome = "Win";
    } else {
      outcome = "Lose";
    }
  }

  update_list.push({
    "gameInstanceId": game._id,
    "gameTitle": GAME_TITLE,
    "gameVersion": GAME_VERSION,
    "gamingId": game.statePlayerName,
    "state": playerState,
    "outcome": outcome
  });


  //terrorist player
  var playerState = "ATTN";
  if (turnData.terroristPlayer.pendingTurn !== null || game.getCurrentTurn().phase === GamePhase.ENDGAME) {
    playerState = "PEND";
  }

  var outcome = "NA";
  if (game.getCurrentTurn().phase === GamePhase.ENDGAME) {
    if (Util.didTerroristPlayerWin(game.getCurrentTurn())) {
      outcome = "Win";
    } else {
      outcome = "Lose";
    }
  }

  update_list.push({
    "gameInstanceId": game._id,
    "gameTitle": GAME_TITLE,
    "gameVersion": GAME_VERSION,
    "gamingId": game.terroristPlayerName,
    "state": playerState,
    "outcome": outcome
  });
};

