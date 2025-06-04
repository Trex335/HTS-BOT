// utils/index.js (or utils.js)
const chalk = require("chalk"); // Assuming you have chalk for logging
const { getThemeColors } = require('./log'); // Assuming utils/log.js exists

const logger = {
  log: (message, tag = "INFO") => {
    const { cv } = getThemeColors();
    console.log(`${cv(`[${tag}]`)} ${message}`);
  },
  warn: (message, tag = "WARN") => {
    const { co } = getThemeColors();
    console.warn(`${co(`[${tag}]`)} ${message}`);
  },
  err: (message, tag = "ERROR") => {
    const { cra } = getThemeColors();
    console.error(`${cra(`[${tag}]`)} ${message}`);
  }
};

module.exports = {
  // Mocking cookie-jar methods
  getJar: () => ({
    _cookies: new Map(),
    getCookies: (url) => {
      // Basic mock: returns an array of mock cookie objects
      if (url.includes("facebook.com")) {
        const c_user = this._cookies.get("c_user") || "mock_c_user_12345";
        return [{ cookieString: () => `c_user=${c_user}` }];
      }
      return [];
    },
    setCookie: (cookieStr, url) => {
      // Basic mock: parses and stores the cookie
      const parts = cookieStr.split(';');
      const [keyVal] = parts;
      const [key, value] = keyVal.split('=');
      if (key && value) {
        this._cookies.set(key.trim(), value.trim());
      }
      // console.log(`[MOCK JAR] Set cookie: ${cookieStr} for ${url}`);
    },
  }),
  // Mocking appState retrieval
  getAppState: (jar) => {
    // Basic mock: returns a fixed appState
    return [
      { key: "c_user", value: "1234567890", domain: "facebook.com", path: "/", expires: Date.now() + 31536000000 },
      { key: "xs", value: "abcdef12345", domain: "facebook.com", path: "/", expires: Date.now() + 31536000000 }
    ];
  },
  // Mocking type checking
  getType: (variable) => {
    return Object.prototype.toString.call(variable).slice(8, -1);
  },
  // Mocking HTTP GET requests
  get: async (url, jar, options, globalOptions, customOptions) => {
    logger.log(`Mock HTTP GET: ${url}`, "HTTP_MOCK");
    // Simulate a basic HTML response with necessary data for login.js
    let mockHtmlBody = `
      <html><body>
      <script>
        irisSeqID:"mockSeqID",appID:219994525426954,endpoint:"wss://edge-mqtt.facebook.com/?region=ASH"
      </script>
      <meta http-equiv="refresh" content="0;url=https://www.facebook.com/home">
      </body></html>
    `;
    if (url.includes('/checkpoint/block')) {
        mockHtmlBody = `<html><body><div id="checkpoint_block_page">You are blocked</div></body></html>`;
    }
    return {
      body: mockHtmlBody,
      statusCode: 200,
    };
  },
  // Mocking cookie saving (no-op for this mock)
  saveCookies: (jar) => (res) => {
    logger.log("Mock: Cookies saved (no-op)", "HTTP_MOCK");
    return res;
  },
  // Mocking string extraction
  getFrom: (body, start, end) => {
    const startIndex = body.indexOf(start);
    if (startIndex === -1) return null;
    const substr = body.substring(startIndex + start.length);
    const endIndex = substr.indexOf(end);
    if (endIndex === -1) return null;
    return substr.substring(0, endIndex);
  },
  // Mocking makeDefaults (for API functions)
  makeDefaults: (html, userID, ctx) => {
    logger.log("Mock: makeDefaults called. Returning dummy functions.", "MOCK_API");
    // Return a dummy object with methods that FCA's src files would expect
    return {
      post: (url, jar, form, options, callback) => {
        logger.log(`Mock API POST: ${url}`, "MOCK_API_CALL");
        callback(null, { body: "Mock POST response" });
      },
      get: (url, jar, options, callback) => {
        logger.log(`Mock API GET: ${url}`, "MOCK_API_CALL");
        callback(null, { body: "Mock GET response" });
      },
      // You might need to add more mock methods here if your FCA src/*.js files use them.
      // E.g., this.httpPost, this.httpGet, this.getFbDtsg, etc.
    };
  },
  // Mocking setProxy
  setProxy: (proxy) => {
    logger.log(`Mock: Proxy set to ${proxy || 'none'}`, "PROXY_MOCK");
  },
  // Placeholder for `complete` function in index.js
  complete: () => logger.log("Bot initialization complete! (Mocked)", "BOT")
};