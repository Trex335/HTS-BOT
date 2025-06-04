// login.js
"use strict";

const utils = require("./utils"); // Path to your local utils.js
const log = require("npmlog");
const { getThemeColors } = require('./utils/log'); // Path to your utils/log.js

const { co, cra } = getThemeColors();

const checkVerified = null;

const defaultLogRecordSize = 100;
log.maxRecordSize = defaultLogRecordSize;

function setOptions(globalOptions, options) {
  Object.keys(options).map(function (key) {
    switch (key) {
      case 'online':
        globalOptions.online = Boolean(options.online);
        break;
      case 'logLevel':
        log.level = options.logLevel;
        globalOptions.logLevel = options.logLevel;
        break;
      case 'logRecordSize':
        log.maxRecordSize = options.logRecordSize;
        globalOptions.logRecordSize = options.logRecordSize;
        break;
      case 'selfListen':
        globalOptions.selfListen = Boolean(options.selfListen);
        break;
      case 'selfListenEvent':
        globalOptions.selfListenEvent = options.selfListenEvent;
        break;
      case 'listenEvents':
        globalOptions.listenEvents = Boolean(options.listenEvents);
        break;
      case 'pageID':
        globalOptions.pageID = options.pageID.toString();
        break;
      case 'updatePresence':
        globalOptions.updatePresence = Boolean(options.updatePresence);
        break;
      case 'forceLogin':
        globalOptions.forceLogin = Boolean(options.forceLogin);
        break;
      case 'userAgent':
        globalOptions.userAgent = options.userAgent;
        break;
      case 'autoMarkDelivery':
        globalOptions.autoMarkDelivery = Boolean(options.autoMarkDelivery);
        break;
      case 'autoMarkRead':
        globalOptions.autoMarkRead = Boolean(options.autoMarkRead);
        break;
      case 'listenTyping':
        globalOptions.listenTyping = Boolean(options.listenTyping);
        break;
      case 'proxy':
        if (typeof options.proxy != "string") {
          delete globalOptions.proxy;
          utils.setProxy();
        } else {
          globalOptions.proxy = options.proxy;
          utils.setProxy(globalOptions.proxy);
        }
        break;
      case 'autoReconnect':
        globalOptions.autoReconnect = Boolean(options.autoReconnect);
        break;
      case 'emitReady':
        globalOptions.emitReady = Boolean(options.emitReady);
        break;
      default:
        log.warn("setOptions", "Unrecognized option given to setOptions: " + key);
        break;
    }
  });
}

function buildAPI(globalOptions, html, jar) {
  const maybeCookie = jar.getCookies("https://www.facebook.com").filter(function (val) {
    return val.cookieString().split("=")[0] === "c_user";
  });

  const objCookie = jar.getCookies("https://www.facebook.com").reduce(function (obj, val) {
    obj[val.cookieString().split("=")[0]] = val.cookieString().split("=")[1];
    return obj;
  }, {});

  if (maybeCookie.length === 0) {
    throw { error: "Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify." };
  }

  if (html.indexOf("/checkpoint/block/?next") > -1) {
    log.warn("login", "Checkpoint detected. Please log in with a browser to verify.");
  }

  const userID = maybeCookie[0].cookieString().split("=")[1].toString();
  const i_userID = objCookie.i_user || null;
  console.log(co("[ DATABASE ]"), (cra("[ CONNECT ]")), `Logged in as ${userID}`);

  try {
    clearInterval(checkVerified);
  } catch (_) { }

  const clientID = (Math.random() * 2147483648 | 0).toString(16);

  const oldFBMQTTMatch = html.match(/irisSeqID:"(.+?)",appID:219994525426954,endpoint:"(.+?)"/);
  let mqttEndpoint = null;
  let region = null;
  let irisSeqID = null;
  let noMqttData = null;

  if (oldFBMQTTMatch) {
    irisSeqID = oldFBMQTTMatch[1];
    mqttEndpoint = oldFBMQTTMatch[2];
    region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
    console.log(co("[ DATABASE ]"), (cra("[ CONNECT ]")), `Account's message region: ${region}`);
  } else {
    const newFBMQTTMatch = html.match(/{"app_id":"219994525426954","endpoint":"(.+?)","iris_seq_id":"(.+?)"}/);
    if (newFBMQTTMatch) {
      irisSeqID = newFBMQTTMatch[2];
      mqttEndpoint = newFBMQTTMatch[1].replace(/\\\//g, "/");
      region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
      console.log(co("[ DATABASE ]"), (cra("[ CONNECT ]")), `Account's message region: ${region}`);
    } else {
      const legacyFBMQTTMatch = html.match(/(\["MqttWebConfig",\[\],{fbid:")(.+?)(",appID:219994525426954,endpoint:")(.+?)(",pollingEndpoint:")(.+?)(3790])/);
      if (legacyFBMQTTMatch) {
        mqttEndpoint = legacyFBMQTTMatch[4];
        region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
        console.log(co("[ DATABASE ]"), (cra("[ CONNECT ]")), `Your account has been disconnected. Please check your Facebook account to see if anything has happened.`);
      } else {
        log.warn("login", "Cannot get MQTT region & sequence ID.");
        noMqttData = html;
      }
    }
  }

  const ctx = {
    userID: userID,
    i_userID: i_userID,
    jar: jar,
    clientID: clientID,
    globalOptions: globalOptions,
    loggedIn: true,
    access_token: 'NONE',
    clientMutationId: 0,
    mqttClient: undefined,
    lastSeqId: irisSeqID,
    syncToken: undefined,
    wsReqNumber: 0,
    wsTaskNumber: 0,
    mqttEndpoint,
    region,
    firstListen: true
  };

  const api = {
    setOptions: setOptions.bind(null, globalOptions),
    getAppState: function getAppState() {
      const appState = utils.getAppState(jar);
      return appState.filter((item, index, self) => self.findIndex((t) => { return t.key === item.key; }) === index);
    }
  };

  if (noMqttData) {
    api["htmlData"] = noMqttData;
  }

  // NOTE: These require corresponding files in a 'src' directory
  // (e.g., src/sendMessage.js, src/getThreadInfo.js)
  // These files are part of a full FCA library and are not provided here.
  const apiFuncNames = [
    'addExternalModule', 'addUserToGroup', 'changeAdminStatus', 'changeArchivedStatus',
    'changeAvatar', 'changeBio', 'changeBlockedStatus', 'changeGroupImage',
    'changeNickname', 'changeThreadColor', 'changeThreadEmoji', 'createNewGroup',
    'createPoll', 'deleteMessage', 'deleteThread', 'forwardAttachment',
    'getCurrentUserID', 'getEmojiUrl', 'getFriendsList', 'getMessage',
    'getThreadHistory', 'getThreadInfo', 'getThreadList', 'getThreadPictures',
    'getUserID', 'getUserInfo', 'handleMessageRequest', 'listenMqtt',
    'logout', 'markAsDelivered', 'markAsRead', 'markAsReadAll', 'markAsSeen',
    'muteThread', 'refreshFb_dtsg', 'removeUserFromGroup', 'resolvePhotoUrl',
    'searchForThread', 'sendMessage', 'sendTypingIndicator', 'setMessageReaction',
    'setPostReaction', 'setTitle', 'threadColors', 'unsendMessage', 'unfriend',
    'editMessage', 'httpGet', 'httpPost', 'httpPostFormData', 'uploadAttachment'
  ];

  const defaultFuncs = utils.makeDefaults(html, i_userID || userID, ctx);

  apiFuncNames.map(function (v) {
    try {
      // In a real FCA setup, './src/' would point to the actual FCA source files
      api[v] = require('./src/' + v)(defaultFuncs, api, ctx);
    } catch (e) {
      log.warn("buildAPI", `Failed to load API function '${v}': ${e.message}`);
    }
  });

  api.listen = api.listenMqtt;

  return [ctx, defaultFuncs, api];
}

function loginHelper(appState, email, password, globalOptions, callback, prCallback) {
  let mainPromise = null;
  const jar = utils.getJar();

  if (appState) {
    if (utils.getType(appState) === 'Array' && appState.some(c => c.name)) {
      appState = appState.map(c => {
        c.key = c.name;
        delete c.name;
        return c;
      });
    } else if (utils.getType(appState) === 'String') {
      const arrayAppState = [];
      appState.split(';').forEach(c => {
        const [key, value] = c.split('=');
        arrayAppState.push({
          key: (key || "").trim(),
          value: (value || "").trim(),
          domain: "facebook.com",
          path: "/",
          expires: new Date().getTime() + 1000 * 60 * 60 * 24 * 365
        });
      });
      appState = arrayAppState;
    }

    appState.map(function (c) {
      const str = c.key + "=" + c.value + "; expires=" + c.expires + "; domain=" + c.domain + "; path=" + c.path + ";";
      jar.setCookie(str, "http://" + c.domain);
    });

    mainPromise = utils
      .get('https://www.facebook.com/', jar, null, globalOptions, { noRef: true })
      .then(utils.saveCookies(jar));
  } else {
    if (email) {
      throw { error: "Currently, the login method by email and password is no longer supported, please use the login method by appState" };
    } else {
      throw { error: "No appState given." };
    }
  }

  let ctx = null;
  let _defaultFuncs = null;
  let api = null;

  mainPromise = mainPromise
    .then(function (res) {
      const reg = /<meta http-equiv="refresh" content="0;url=([^"]+)[^>]+>/;
      const redirect = reg.exec(res.body);
      if (redirect && redirect[1]) {
        return utils
          .get(redirect[1], jar, null, globalOptions)
          .then(utils.saveCookies(jar));
      }
      return res;
    })
    .then(function (res) {
      const html = res.body;
      const stuff = buildAPI(globalOptions, html, jar);
      ctx = stuff[0];
      _defaultFuncs = stuff[1];
      api = stuff[2];
      return res;
    });

  if (globalOptions.pageID) {
    mainPromise = mainPromise
      .then(function () {
        return utils
          .get('https://www.facebook.com/' + ctx.globalOptions.pageID + '/messages/?section=messages&subsection=inbox', ctx.jar, null, globalOptions);
      })
      .then(function (resData) {
        let url = utils.getFrom(resData.body, 'window.location.replace("https:\\/\\/www.facebook.com\\', '");').split('\\').join('');
        url = url.substring(0, url.length - 1);
        return utils
          .get('https://www.facebook.com' + url, ctx.jar, null, globalOptions);
      });
  }

  mainPromise
    .then(function () {
      console.log(co("[ DATABASE ]"), (cra("[ CONNECT ]")), 'Done logging in.');
      return callback(null, api);
    })
    .catch(function (e) {
      log.error("login", e.error || e);
      callback(e);
    });
}

function login(loginData, options, callback) {
  if (utils.getType(options) === 'Function' || utils.getType(options) === 'AsyncFunction') {
    callback = options;
    options = {};
  }

  const globalOptions = {
    selfListen: false,
    selfListenEvent: false,
    listenEvents: false,
    listenTyping: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkDelivery: true,
    autoMarkRead: false,
    autoReconnect: true,
    logRecordSize: defaultLogRecordSize,
    online: true,
    emitReady: false,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/600.3.18 (KHTML, like Gecko) Version/8.0.3 Safari/600.3.18"
  };

  setOptions(globalOptions, options);

  let prCallback = null;
  if (utils.getType(callback) !== "Function" && utils.getType(callback) !== "AsyncFunction") {
    let rejectFunc = null;
    let resolveFunc = null;
    var returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });
    prCallback = function (error, api) {
      if (error) {
        return rejectFunc(error);
      }
      return resolveFunc(api);
    };
    callback = prCallback;
  }
  loginHelper(loginData.appState, loginData.email, loginData.password, globalOptions, callback, prCallback);
  return returnPromise;
}

module.exports = login;