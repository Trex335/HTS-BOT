const { exec, spawn } = require("child_process");
const chalk = require("chalk");
const check = require("get-latest-version");
const fs = require("fs-extra");
const semver = require("semver");
const { readdirSync, readFileSync, writeFileSync } = require("fs-extra");
const { join, resolve } = require("path");
const express = require("express");
const path = require("path");
const moment = require("moment-timezone");
const cron = require("node-cron");
const axios = require('axios'); // For external API calls if needed

// >>> IMPORTANT CHANGE HERE: USING A REAL FCA LIBRARY <<<
// Make sure you have installed 'josh-fca' by running: npm install josh-fca
// If you prefer another FCA fork (e.g., '@dongdev/fca-unofficial'), replace 'josh-fca' below.
const login = require('josh-fca');

// --- Configuration (Embedded from config.json, but you can move this to a separate file if needed) ---
const configJson = {
  "version": "1.0.1",
  "language": "en",
  "email": "j05473413@gmail.com", // This will be used only if appstate.json is missing or invalid
  "password": "sssaaa",           // This will be used only if appstate.json is missing or invalid
  "useEnvForCredentials": false,
  "envGuide": "When useEnvForCredentials enabled, it will use the process.env key provided for email and password, which helps hide your credentials, you can find env in render's environment tab, you can also find it in replit secrets.",
  "DeveloperMode": true,
  "autoCreateDB": true,
  "allowInbox": false,
  "autoClean": true,
  "adminOnly": false, // Set to true if you want the bot to only respond to ADMINBOT IDs (higher protection, limited functionality)
  "encryptSt": false,
  "removeSt": false,
  "UPDATE": {
    "Package": true,
    "EXCLUDED": [
      "chalk",
      "mqtt",
      "https-proxy-agent"
    ],
    "Info": "This section manages the bot's automatic package updates. To disable this function, set 'Package' to false. If you only want to exclude specific packages, set them to true and add them in the 'EXCLUDED' list."
  },
  "commandDisabled": ["ping.js"], // Disabled help and ping commands. Ensure your non-prefix/both commands are NOT here!
  "eventDisabled": ["welcome.js"], // Disabled welcome event
  "BOTNAME": "Bot",
  "PREFIX": "?",
  "ADMINBOT": [
    "61555393416824", // Replace with your Facebook User ID (Your ID from previous logs)
    // "OTHER_FB_UID" // Replace with other Facebook User IDs if needed
  ],
  "DESIGN": {
    "Title": "MTX-BOT",
    "Theme": "Blue",
    "Admin": "Hassan",
    "Setup": {
      "Info": "Design your own custom terminal Titlebar for the title and must contain no numbers",
      "Theme": "Customize your console effortlessly with various theme colors. Explore Aqua, Fiery, Blue, Orange, Pink, Red, Retro, Sunlight, Teen, Summer, Flower, Ghost, Purple, Rainbow, and Hacker themes to enhance your terminal logs."
    }
  },
  "APPSTATEPATH": "appstate.json",
  "DEL_FUNCTION": false,
  "ADD_FUNCTION": true,
  "FCAOption": {
    "forceLogin": false,
    "listenEvents": true,
    "autoMarkDelivery": true, // Mark messages as delivered (appears more human)
    "autoMarkRead": true,     // Mark messages as read (appears more human)
    "logLevel": "silent",     // Reduce log verbosity for production
    "selfListen": false,
    "online": true,           // If set to 'false', bot will appear offline. Setting to 'true' is common but might slightly increase detection risk if Facebook monitors continuous online status from unusual IPs. 'randomActivity' function below already toggles this.
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", // More recent user agent for better mimicry
    "autoReconnect": true,    // Enable auto-reconnect for stability
    "autoRestore": true,      // Restore session after disconnect for stability
    "syncUp": true,           // Sync up with Facebook server for stability
    "delay": 500              // Add a slight delay to API calls (good for human-like timing)
  },
  "daily": {
    "cooldownTime": 43200000,
    "rewardCoin": 500
  },
  "work": {
    "cooldownTime": 1200000
  },
  "help": {
    "autoUnsend": true,
    "delayUnsend": 60
  },
  "adminUpdate": {
    "autoUnsend": true,
    "sendNoti": true,
    "timeToUnsend": 10
  },
  "adminNoti": {
    "autoUnsend": true,
    "sendNoti": true,
    "timeToUnsend": 10
  },
  "sing": {
    "YOUTUBE_API": "AIzaSyCqox-KXEwDncsuo2HIpE0MF8J7ATln5Vc",
    "SOUNDCLOUD_API": "M4TSyS6eV0AcMynXkA3qQASGcOFQTWub"
  },
  "video": {
    "YOUTUBE_API": "AIzaSyDEE1-zZSRVI8lTaQOVsIAQFgL-_BJKVhk"
  },
  "audio": {
    "YOUTUBE_API": "AIzaSyDEE1-zZSRVI8lTaQOVsIAQFgL-_BJKVhk"
  },
  "menu": {
    "autoUnsend": true,
    "delayUnsend": 60
  },
  "humanLikeDelay": { // Configuration for human-like delays *before* command/event execution
    "min": 1000, // Minimum delay in milliseconds (1 second)
    "max": 5000  // Maximum delay in milliseconds (5 seconds) - Can increase for more caution
  },
  "randomActivity": { // Configuration for random activities to appear less like a bot
    "status": true,
    "intervalMin": 30, // Minimum interval in minutes for an activity to occur
    "intervalMax": 120 // Maximum interval in minutes for an activity to occur
  }
};

// --- UTILS ---
const getThemeColors = () => {
  return {
    cra: chalk.hex("#FF0000"), // Red
    cv: chalk.hex("#00FFFF"), // Cyan
    cb: chalk.hex("#0000FF"), // Blue
  };
};

const logger = {
  log: (message, tag = "INFO") => {
    const { cra, cv, cb } = getThemeColors();
    console.log(`${cv(`[${tag}]`)} ${message}`);
  },
  loader: (message, tag = "LOADER") => {
    const { cra, cv, cb } = getThemeColors();
    console.log(`${cb(`[${tag}]`)} ${message}`);
  },
  err: (message, tag = "ERROR") => {
    const { cra, cv, cb } = getThemeColors();
    console.error(`${cra(`[${tag}]`)} ${message}`);
  },
  warn: (message, tag = "WARN") => {
    const { cra, cv, cb } = getThemeColors();
    console.warn(`${chalk.hex("#FFA500")(`[${tag}]`)} ${message}`); // Orange for warnings
  }
};

const utils = {
  decryptState: (encryptedState, key) => {
    // Implement actual decryption if config.encryptSt is true
    // For now, this is a placeholder and assumes non-encrypted state
    return encryptedState;
  },
  encryptState: (state, key) => {
    // Implement actual encryption if config.encryptSt is true
    // For now, this is a placeholder and returns the state as is
    return state;
  },
  complete: () => {
    logger.log("Bot initialization complete!", "BOT");
  },
  // Utility for human-like delays before commands/events
  humanDelay: async () => {
    const min = global.config.humanLikeDelay.min;
    const max = global.config.humanLikeDelay.max;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    logger.log(`Adding human-like delay of ${delay}ms...`, "DELAY");
    return new Promise(resolve => setTimeout(resolve, delay));
  }
};

// --- LISTEN HANDLER ---
const listen = ({ api }) => {
  return async (error, event) => {
    if (error) {
      logger.err(`Listen error: ${error.message}`, "LISTENER_ERROR");
      if (error.error === 'Not logged in') {
        logger.warn("Bot session expired or invalid. Attempting re-login...", "RELOGIN");
        process.exit(1);
      }
      return;
    }

    // If adminOnly is true, only process messages from ADMINBOT IDs
    if (global.config.adminOnly && !global.config.ADMINBOT.includes(event.senderID)) {
      // You can optionally send a message here indicating the bot is in admin-only mode
      // api.sendMessage("I'm currently in admin-only mode and can only respond to my administrator.", event.threadID);
      return; // Ignore messages from non-admin users
    }

    if (event.type === "message" && event.body) {
      const lowerCaseBody = event.body.toLowerCase();
      const prefix = global.config.PREFIX;

      // Handle the special 'prefix' command first
      if (lowerCaseBody === "prefix") {
        await utils.humanDelay();
        return api.sendMessage(
          `🌐 System prefix: ${prefix}\n🛸 Your box chat prefix: ${prefix}`,
          event.threadID,
          event.messageID
        );
      }

      let commandFoundAndExecuted = false;

      // --- Check for non-prefix commands ---
      for (const cmdNameLower of global.client.nonPrefixCommands) {
          // Check if message body is exactly the command name OR starts with the command name followed by a space
          if (lowerCaseBody === cmdNameLower || lowerCaseBody.startsWith(`${cmdNameLower} `)) {
              // Find the actual command module (case-sensitive)
              let foundCommand = null;
              for (const [key, cmdModule] of global.client.commands.entries()) {
                  if (key.toLowerCase() === cmdNameLower && (cmdModule.config.usePrefix === false || cmdModule.config.usePrefix === "both")) {
                      foundCommand = cmdModule;
                      break;
                  }
              }

              if (foundCommand) {
                  // Extract the prompt/arguments for the non-prefix command
                  const promptText = lowerCaseBody.startsWith(`${cmdNameLower} `) ? event.body.slice(cmdNameLower.length + 1).trim() : "";
                  const args = promptText.split(/ +/).filter(Boolean); // Filter(Boolean) removes empty strings

                  // Check permissions for the non-prefix command
                  if (foundCommand.config.hasPermssion !== undefined && foundCommand.config.hasPermssion > 0) {
                      if (foundCommand.config.hasPermssion === 1 && !global.config.ADMINBOT.includes(event.senderID)) {
                          api.sendMessage("You don't have permission to use this command.", event.threadID, event.messageID);
                          commandFoundAndExecuted = true;
                          break; // Stop checking other non-prefix commands
                      }
                  }

                  try {
                      logger.log(`Executing non-prefix command: ${foundCommand.config.name} with prompt: "${promptText}"`, "NON_PREFIX_COMMAND");
                      await utils.humanDelay();
                      // Pass the extracted prompt (full string after command name) and args (split by space)
                      await foundCommand.run({ api, event, args, global, prompt: promptText });
                      commandFoundAndExecuted = true;
                  } catch (e) {
                      logger.err(`Error executing non-prefix command '${foundCommand.config.name}': ${e.message}`, "NON_PREFIX_EXEC");
                      api.sendMessage(`An error occurred while running the '${foundCommand.config.name}' command.`, event.threadID, event.messageID);
                      commandFoundAndExecuted = true;
                  }
                  break; // Stop checking other non-prefix commands once one is found and handled
              }
          }
      }

      if (commandFoundAndExecuted) {
          return; // Don't process as a prefixed command if a non-prefix one was found and handled
      }
      // --- End check for non-prefix commands ---

      // Existing prefixed command logic
      if (event.body.startsWith(prefix)) {
        const args = event.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) {
          return api.sendMessage(
            `⚠️ The command you are using does not exist.\n` +
            `Type ${prefix}help to see all available commands.`,
            event.threadID,
            event.messageID
          );
        }

        const command = global.client.commands.get(commandName);

        if (!command) {
          return api.sendMessage(
            `⚠️ The command "${prefix}${commandName}" does not exist.\n` +
            `Type ${prefix}help to see all available commands.`,
            event.threadID,
            event.messageID
          );
        }

        // NEW: Only run prefixed command if it's explicitly true or "both"
        if (command.config.usePrefix === false) { // It's a non-prefix only command, so ignore if used with prefix
            return api.sendMessage(
              `⚠️ The command "${command.config.name}" does not require a prefix.\n` +
              `Just type "${command.config.name} ${command.config.usages.split('OR')[0].trim()}" to use it.`,
              event.threadID,
              event.messageID
            );
        }

        try {
          if (command.config.hasPermssion !== undefined && command.config.hasPermssion > 0) {
            if (command.config.hasPermssion === 1 && !global.config.ADMINBOT.includes(event.senderID)) {
              api.sendMessage("You don't have permission to use this command.", event.threadID, event.messageID);
              return;
            }
          }

          logger.log(`Executing command: ${command.config.name}`, "COMMAND");
          await utils.humanDelay(); // Delay before command execution
          // For prefixed commands, 'prompt' will be the entire argument string after the command name.
          // 'args' will be the same string split by spaces.
          const prefixedPrompt = args.join(" ");
          await command.run({ api, event, args, global, prompt: prefixedPrompt });
        } catch (e) {
          logger.err(`Error executing command '${command.config.name}': ${e.message}`, "COMMAND_EXEC");
          api.sendMessage(`An error occurred while running the '${command.config.name}' command.`, event.threadID, event.messageID);
        }
      }
    }

    // Event Handling
    global.client.events.forEach(async (eventModule) => {
      if (eventModule.config.eventType && eventModule.config.eventType.includes(event.type)) {
        try {
          logger.log(`Executing event: ${eventModule.config.name} for type ${event.type}`, "EVENT");
          await utils.humanDelay(); // Delay before event execution
          await eventModule.run({ api, event, global });
        } catch (e) {
          logger.err(`Error executing event '${eventModule.config.name}': ${e.message}`, "EVENT_EXEC");
        }
      }
    });
  };
};

// --- CUSTOM SCRIPT (for auto-restart, auto-greeting etc.) ---
const customScript = ({ api }) => {
  logger.log("Running custom script...", "CUSTOM");

  const minInterval = 5;
  let lastMessageTime = 0;
  let messagedThreads = new Set();

  const autoStuffConfig = {
    autoRestart: {
      status: false, // Keeping this false to avoid frequent server restarts that might appear suspicious
      time: 40,
      note: 'To avoid problems, enable periodic bot restarts',
    },
    acceptPending: {
      status: true,
      time: 30,
      note: 'Approve waiting messages after a certain time',
    },
  };

  function autoRestart(config) {
    if (config.status) {
      cron.schedule(`*/${config.time} * * * *`, () => {
        logger.log('Start rebooting the system!', 'Auto Restart');
        process.exit(1); // Exit with code 1 to indicate a restart
      });
    } else {
      logger.warn('Automatic bot restarts are disabled by configuration to reduce potential detection.', 'Auto Restart');
    }
  }

  function acceptPending(config) {
    if (config.status) {
      cron.schedule(`*/${config.time} * * * *`, async () => {
        try {
          const list = [
            ...(await api.getThreadList(1, null, ['PENDING'])),
            ...(await api.getThreadList(1, null, ['OTHER'])),
          ];
          if (list[0]) {
            await utils.humanDelay(); // Delay before sending message
            api.sendMessage('You have been approved for the queue. (This is an automated message)', list[0].threadID);
          }
        } catch (e) {
          logger.err(`Error accepting pending messages: ${e.message}`, "AUTO_PENDING");
        }
      });
    }
  }

  autoRestart(autoStuffConfig.autoRestart);
  acceptPending(autoStuffConfig.acceptPending);

  // AUTOGREET EVERY 30 MINUTES
  // This can also be a source of detection if too many greetings are sent too frequently.
  // Consider disabling or making it less frequent if issues persist.
  cron.schedule('*/30 * * * *', () => {
    const currentTime = Date.now();
    if (currentTime - lastMessageTime < minInterval) {
      return;
    }
    api.getThreadList(25, null, ['INBOX'], async (err, data) => {
      if (err) return console.error("Error [Thread List Cron]: " + err);
      let i = 0;
      let j = 0;

      async function message(thread) {
        try {
          await utils.humanDelay(); // Delay before sending message
          api.sendMessage({
            body: `Hey There! How are you? ヾ(＾-＾)ノ`
          }, thread.threadID, (err) => {
            if (err) return;
            messagedThreads.add(thread.threadID);
          });
        } catch (error) {
          console.error("Error sending a message:", error);
        }
      }

      while (j < 20 && i < data.length) {
        if (data[i].isGroup && data[i].name != data[i].threadID && !messagedThreads.has(data[i].threadID)) {
          await message(data[i]);
          j++;
          const CuD = data[i].threadID;
          setTimeout(() => {
            messagedThreads.delete(CuD);
          }, 1000);
        }
        i++;
      }
    });
  }, {
    scheduled: true,
    timezone: "Asia/Dhaka"
  });

  // Random Human-like Activity: Toggles online status, marks as read.
  if (global.config.randomActivity.status) {
    cron.schedule('*/1 * * * *', async () => { // Check every minute if an activity should occur
      const minInterval = global.config.randomActivity.intervalMin;
      const maxInterval = global.config.randomActivity.intervalMax;
      const randomMinutes = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

      // Only perform activity if enough time has passed since the last one
      if (Date.now() - global.client.lastActivityTime > randomMinutes * 60 * 1000) {
        try {
          logger.log("Performing random human-like activity...", "ACTIVITY");
          const threadList = await api.getThreadList(5, null, ['INBOX']); // Get a few recent threads
          if (threadList.length > 0) {
            const randomThread = threadList[Math.floor(Math.random() * threadList.length)];

            const activities = [
              async () => {
                // Briefly go offline and back online
                await api.setOptions({ online: false });
                logger.log("Temporarily set bot offline.", "ACTIVITY");
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000)); // Stay offline for 2-7 seconds
                await api.setOptions({ online: true });
                logger.log("Set bot back online.", "ACTIVITY");
              },
              async () => {
                // Mark a random message as read
                const messages = await api.getThreadHistory(randomThread.threadID, 5);
                if (messages && messages.length > 0) {
                  const unreadMessages = messages.filter(msg => !msg.isRead);
                  if (unreadMessages.length > 0) {
                    const randomUnreadMessage = unreadMessages[Math.floor(Math.random() * unreadMessages.length)];
                    await api.markAsRead(randomUnreadMessage.messageID);
                    logger.log(`Marked message ${randomUnreadMessage.messageID} in thread ${randomThread.threadID} as read.`, "ACTIVITY");
                  }
                }
              }
            ];

            if (activities.length > 0) {
              const randomActivity = activities[Math.floor(Math.random() * activities.length)];
              await randomActivity();
              global.client.lastActivityTime = Date.now(); // Update last activity time
            } else {
              logger.log("No random activities available after filtering.", "ACTIVITY");
            }
          }
        } catch (e) {
          logger.err(`Error performing random activity: ${e.message}`, "ACTIVITY_ERROR");
        }
      }
    }, {
      scheduled: true,
      timezone: "Asia/Dhaka"
    });
  }
};

const sign = "(›^-^)›";
const fbstate = "appstate.json";

const delayedLog = async (message) => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  for (const char of message) {
    process.stdout.write(char);
    await delay(50);
  }
  console.log();
};

const showMessage = async () => {
  const message =
    chalk.yellow(" ") +
    `The "removeSt" property is set true in the config.json. Therefore, the Appstate was cleared effortlessly! You can now place a new one in the same directory.`;
  await delayedLog(message);
};

// Check if appstate.json should be removed based on configJson
if (configJson.removeSt) {
  fs.writeFileSync(fbstate, sign, { encoding: "utf8", flag: "w" });
  showMessage();
  configJson.removeSt = false; // Only affect the current run for removal
  setTimeout(() => {
    process.exit(0);
  }, 10000);
}

// Load package.json for dependency checking
let packageJson;
try {
  packageJson = require("./package.json");
} catch (error) {
  console.error("Error loading package.json:", error);
  process.exit(1);
}

function nv(version) {
  return version.replace(/^\^/, "");
}

async function updatePackage(dependency, currentVersion, latestVersion) {
  if (!configJson.UPDATE.EXCLUDED.includes(dependency)) {
    const ncv = nv(currentVersion);

    if (semver.neq(ncv, latestVersion)) {
      console.log(
        chalk.bgYellow.bold(` UPDATE `),
        `There is a newer version ${chalk.yellow(
          `(^${latestVersion})`
        )} available for ${chalk.yellow(
          dependency
        )}. Updating to the latest version...`
      );

      // This modifies the in-memory packageJson.dependencies.
      // To make it persistent, you'd need to write back to the physical package.json.
      packageJson.dependencies[dependency] = `^${latestVersion}`;

      exec(`npm install ${dependency}@latest`, (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.red('Error executing npm install command:'), error);
          return;
        }
        console.log(chalk.green('npm install output:'), stdout);
      });
    }
  }
}

async function checkAndUpdate() {
  if (configJson.UPDATE && configJson.UPDATE.Package) {
    try {
      for (const [dependency, currentVersion] of Object.entries(
        packageJson.dependencies
      )) {
        const latestVersion = await check(dependency);
        await updatePackage(dependency, currentVersion, latestVersion);
      }
    } catch (error) {
      console.error('Error checking and updating dependencies:', error);
    }
  } else {
    console.log(chalk.yellow(''), 'Update for packages is not enabled in configJson');
  }
}

global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleSchedule: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: 'config.json', // Dummy path, config is embedded
  getTime: function (option) {
    switch (option) {
      case "seconds":
        return `${moment.tz("Asia/Dhaka").format("ss")}`;
      case "minutes":
        return `${moment.tz("Asia/Dhaka").format("mm")}`;
      case "hours":
        return `${moment.tz("Asia/Dhaka").format("HH")}`;
      case "date":
        return `${moment.tz("Asia/Dhaka").format("DD")}`;
      case "month":
        return `${moment.tz("Asia/Dhaka").format("MM")}`;
      case "year":
        return `${moment.tz("Asia/Dhaka").format("YYYY")}`;
      case "fullHour":
        return `${moment.tz("Asia/Dhaka").format("HH:mm:ss")}`;
      case "fullYear":
        return `${moment.tz("Asia/Dhaka").format("DD/MM/YYYY")}`;
      case "fullTime":
        return `${moment.tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY")}`;
      default:
        return moment.tz("Asia/Dhaka").format();
    }
  },
  timeStart: Date.now(),
  lastActivityTime: Date.now(), // Initialize last activity time
  nonPrefixCommands: new Set() // To store names of commands that don't need a prefix or use "both"
};

global.data = {
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: [],
  allUserID: [],
  allCurrenciesID: [],
  allThreadID: [],
};

global.utils = utils;
global.loading = logger;
global.nodemodule = {}; // This will hold loaded npm modules
global.config = configJson; // Use the embedded configJson directly
global.configModule = {};
global.moduleData = [];
global.language = {};
global.account = {};

// Load package dependencies into global.nodemodule
for (const property in packageJson.dependencies) {
  try {
    global.nodemodule[property] = require(property);
  } catch (e) {
    logger.err(`Failed to load module: ${property} - ${e.message}`, "MODULE_LOAD");
  }
}

const { cra, cv, cb } = getThemeColors();

// Mock language data for demonstration
const mockLangFileContent = `
commands.hello=Hello there!
`;
const langFile = mockLangFileContent.split(/\r?\n|\r/);
const langData = langFile.filter(
  (item) => item.indexOf("#") != 0 && item != ""
);
for (const item of langData) {
  const getSeparator = item.indexOf("=");
  const itemKey = item.slice(0, getSeparator);
  const itemValue = item.slice(getSeparator + 1, item.length);
  const head = itemKey.slice(0, itemKey.indexOf("."));
  const key = itemKey.replace(head + ".", "");
  const value = itemValue.replace(/\\n/gi, "\n");
  if (typeof global.language[head] == "undefined")
    global.language[head] = {};
  global.language[head][key] = value;
}

global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) {
    throw new Error(`${__filename} - Not found key language: ${args[0]}`);
  }
  var text = langText[args[0]][args[1]];
  if (typeof text === "undefined") {
    throw new Error(`${__filename} - Not found key text: ${args[1]}`);
  }
  for (var i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, "g");
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

// --- Bot Initialization ---
async function onBot() {
  let loginData;
  const appStateFile = resolve(
    join(global.client.mainPath, configJson.APPSTATEPATH || "appstate.json")
  );

  let appState = null;
  try {
    const rawAppState = fs.readFileSync(appStateFile, "utf8");
    if (rawAppState[0] !== "[") {
      // Potentially encrypted
      appState = configJson.encryptSt
        ? JSON.parse(global.utils.decryptState(rawAppState, process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER))
        : JSON.parse(rawAppState);
    } else {
      appState = JSON.parse(rawAppState);
    }
    logger.loader("Found the bot's appstate.");
  } catch (e) {
    logger.err(`Can't find or parse the bot's appstate: ${e.message}`, "error");
    if (configJson.email && configJson.password) {
      logger.log("Attempting to log in with email/password from config.", "LOGIN");
    } else if (configJson.useEnvForCredentials && process.env[configJson.email] && process.env[configJson.password]) {
      logger.log("Attempting to log in with email/password from environment variables.", "LOGIN");
    } else {
      logger.err("No valid appstate or credentials found. Exiting.", "LOGIN");
      return process.exit(0);
    }
  }

  // Determine login data based on appState or credentials
  if (appState) {
    loginData = { appState: appState };
  } else if (configJson.useEnvForCredentials && process.env[configJson.email] && process.env[configJson.password]) {
    loginData = {
      email: process.env[configJson.email],
      password: process.env[configJson.password],
    };
  } else if (configJson.email && configJson.password) {
      loginData = {
          email: configJson.email,
          password: configJson.password,
      };
  } else {
      logger.err("No valid appstate or credentials found. Exiting.", "LOGIN");
      return process.exit(0);
  }

  // Add the FCA options to the login function
  const fcaLoginOptions = {
    ...global.config.FCAOption,
    forceLogin: global.config.FCAOption.forceLogin,
    listenEvents: global.config.FCAOption.listenEvents,
    autoMarkDelivery: global.config.FCAOption.autoMarkDelivery,
    autoMarkRead: global.config.FCAOption.autoMarkRead,
    logLevel: global.config.FCAOption.logLevel,
    selfListen: global.config.FCAOption.selfListen,
    online: global.config.FCAOption.online,
    userAgent: global.config.FCAOption.userAgent,
    autoReconnect: global.config.FCAOption.autoReconnect,
    autoRestore: global.config.FCAOption.autoRestore,
    syncUp: global.config.FCAOption.syncUp,
    delay: global.config.FCAOption.delay
  };

  login(loginData, fcaLoginOptions, async (err, api) => { // Pass fcaLoginOptions here
    if (err) {
      console.error(err);
      // More descriptive error for login failures, guiding the user to browser login
      if (err.error === 'login-approval' || err.error === 'Login approval needed') {
          logger.err("Login approval needed. Please approve the login from your Facebook account in a web browser, then try again.", "LOGIN_FAILED");
      } else if (err.error === 'Incorrect username/password.') {
          logger.err("Incorrect email or password. Please check your config.json or environment variables.", "LOGIN_FAILED");
      } else if (err.error === 'The account is temporarily unavailable.') {
          logger.err("The account is temporarily unavailable. This might be a temporary Facebook block. Try logging into Facebook in a browser to clear any flags, then try again.", "LOGIN_FAILED");
      } else if (err.error.includes('error retrieving userID') || err.error.includes('from an unknown location')) {
          logger.err(`Facebook login blocked from an unknown location. You must log into your Facebook account directly in a web browser and clear any security checks, then re-deploy the bot. Error: ${err.message || JSON.stringify(err)}`, "LOGIN_FAILED");
      }
      else {
          logger.err(`Fatal login error: ${err.message || JSON.stringify(err)}. Try logging into Facebook in a browser to resolve security issues.`, "LOGIN_FAILED");
      }
      return process.exit(0);
    }

    // Save new appstate only if login was successful and appState was initially used or generated
    let newAppState;
    try {
        if (api.getAppState) {
            newAppState = api.getAppState();
            let d = JSON.stringify(newAppState, null, "\x09");
            if ((process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER) && global.config.encryptSt) {
                d = await global.utils.encryptState(d, process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER);
            }
            writeFileSync(appStateFile, d);
            logger.log("Appstate updated and saved.", "APPSTATE");
        } else {
            logger.warn("Could not retrieve new appstate. 'api.getAppState' not available from the FCA library. This might be normal for some FCA versions or if using only email/password login.", "APPSTATE");
        }
    } catch (appStateError) {
        logger.err(`Error saving appstate: ${appStateError.message}`, "APPSTATE_SAVE_ERROR");
    }

    // Ensure newAppState is checked for existence before accessing .map
    if (newAppState && Array.isArray(newAppState)) {
        global.account.cookie = newAppState.map((i) => (i = i.key + "=" + i.value)).join(";");
    } else {
        logger.warn("Could not set global.account.cookie. New appstate was not an array or was not retrieved.", "APPSTATE");
        global.account.cookie = ""; // Set to empty string to avoid errors later
    }

    global.client.api = api;
    global.config.version = configJson.version;

    // --- Automatic File & Directory Creation ---
    const commandsPath = `${global.client.mainPath}/modules/commands`;
    const eventsPath = `${global.client.mainPath}/modules/events`;
    const includesCoverPath = `${global.client.mainPath}/includes/cover`;

    // Ensure directories exist
    fs.ensureDirSync(commandsPath);
    fs.ensureDirSync(eventsPath);
    fs.ensureDirSync(includesCoverPath);
    logger.log("Ensured module directories exist.", "SETUP");

    // --- Removed: Automatic creation of hello.js and help.js ---
    // You will need to manually add your command files to modules/commands/
    // Example:
    // const helloCommandPath = `${commandsPath}/hello.js`;
    // if (!fs.existsSync(helloCommandPath)) { /* ... create hello.js ... */ }
    // const helpCommandPath = `${commandsPath}/help.js`;
    // if (!fs.existsSync(helpCommandPath)) { /* ... create help.js ... */ }
    // --- END REMOVED COMMAND ADDITION ---

    logger.log("Default command and event files ensured.", "SETUP");

    const listCommand = readdirSync(commandsPath).filter(
      (command) =>
        command.endsWith(".js") &&
        !global.config.commandDisabled.includes(command)
    );
    console.log(cv(`\n` + `──LOADING COMMANDS─●`));
    for (const command of listCommand) {
      try {
        const module = require(`${commandsPath}/${command}`);
        const { config } = module;

        if (!config?.name || !config?.commandCategory || !config?.hasOwnProperty("usePrefix") || !module.run) {
          throw new Error(`[ COMMAND ] ${command} is not in the correct format. Missing name, category, usePrefix, or run function.`);
        }
        if (global.client.commands.has(config.name)) {
          logger.err(`[ COMMAND ] ${chalk.hex("#FFFF00")(command)} Module is already loaded!`, "COMMAND");
          continue;
        }

        // NEW: If the command is designated as non-prefix OR 'both', add its lowercase name to the set
        if (config.usePrefix === false || config.usePrefix === "both") {
            global.client.nonPrefixCommands.add(config.name.toLowerCase());
        }

        if (module.onLoad) {
          try {
            await module.onLoad({ api }); // Ensure onLoad is awaited if it's async
          } catch (error) {
            throw new Error("Unable to load the onLoad function of the module.");
          }
        }
        if (module.handleEvent) global.client.eventRegistered.push(config.name);
        global.client.commands.set(config.name, module);
        logger.log(`${cra(`LOADED`)} ${cb(config.name)} success`, "COMMAND");
      } catch (error) {
        logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(command)} fail ` + error, "COMMAND");
      }
    }

    // --- Event Loading ---
    const events = readdirSync(eventsPath).filter(
      (ev) =>
        ev.endsWith(".js") && !global.config.eventDisabled.includes(ev)
    );
    console.log(cv(`\n` + `──LOADING EVENTS─●`));
    for (const ev of events) {
      try {
        const event = require(join(eventsPath, ev));
        const { config, onLoad, run } = event;
        if (!config || !config.name || !config.eventType || !run) {
          logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} fail: Missing config, name, eventType, or run function.`, "EVENT");
          continue;
        }

        if (onLoad) {
          try {
            await onLoad({ api });
          } catch (error) {
            throw new Error("Unable to load the onLoad function of the event.");
          }
        }
        global.client.events.set(config.name, event);
        logger.log(`${cra(`LOADED`)} ${cb(config.name)} success`, "EVENT");
      } catch (error) {
        logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} fail ` + error, "EVENT");
      }
    }

    global.client.listenMqtt = global.client.api.listenMqtt(listen({ api: global.client.api }));
    customScript({ api: global.client.api });
    utils.complete();

    // --- Send activation message to ADMINBOT IDs ---
    if (global.config.ADMINBOT && global.config.ADMINBOT.length > 0) {
      const adminID = global.config.ADMINBOT[0]; // Assuming the first admin ID is your main ID
      try {
        await utils.humanDelay(); // Delay before sending activation message
        await api.sendMessage(
          `✅ Bot is now activated and running! Type '${global.config.PREFIX}help' to see commands.`,
          adminID
        );
        logger.log(`Sent activation message to Admin ID: ${adminID}`, "ACTIVATION");
      } catch (e) {
        logger.err(`Failed to send activation message to Admin ID ${adminID}: ${e.message}`, "ACTIVATION_FAIL");
      }
    }
  });
}

// --- Express Server for Uptime Robot ---
// Define PORT early
const PORT = process.env.PORT || 3000;

// Function to start the Express server
function startWebServer() {
  const app = express();

  app.get('/', (req, res) => {
    res.status(200).send('Bot is awake and running!');
  });

  app.listen(PORT, '0.0.0.0', () => { // Explicitly bind to '0.0.0.0' for Render
    logger.log(`Uptime Robot endpoint listening on port ${PORT}`, "SERVER");
  }).on('error', (err) => {
    logger.err(`Failed to start Express server: ${err.message}`, "SERVER_ERROR");
    process.exit(1); // Exit if the server can't start
  });
}

// --- Main execution flow ---
// 1. Start the web server first to ensure it's listening.
startWebServer();

// 2. Then, start the bot's Facebook login and listening process.
onBot();
