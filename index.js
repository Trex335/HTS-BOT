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

const login = require('josh-fca');

// Define defaultEmojiTranslate early so it's accessible within mockLangFileContent
const defaultEmojiTranslate = "🌐";

// --- Configuration (Embedded from config.json, but you can move this to a separate file if needed) ---
const configJson = {
  "version": "1.0.1",
  "language": "en",
  "email": "jo5473413@gmail.com",
  "password": "sssaaa",
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
    "Package": false, // Changed to false to prevent automatic package updates
    "EXCLUDED": [
      "chalk",
      "mqtt",
      "https-proxy-agent"
    ],
    "Info": "This section manages the bot's automatic package updates. To disable this function, set 'Package' to false. If you only want to exclude specific packages, set them to true and add them in the 'EXCLUDED' list."
  },
  "commandDisabled": ["ping.js"],
  "eventDisabled": ["welcome.js"],
  "BOTNAME": "Bot",
  "PREFIX": "?",
  "ADMINBOT": [
    "61555393416824", // Replace with your Facebook User ID
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
    "autoMarkDelivery": true,
    "autoMarkRead": true,
    "logLevel": "silent",
    "selfListen": false,
    "online": true,
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "autoReconnect": true,
    "autoRestore": true,
    "syncUp": true,
    "delay": 500
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
  "humanLikeDelay": {
    "min": 1000,
    "max": 5000
  },
  "randomActivity": {
    "status": true,
    "intervalMin": 30,
    "intervalMax": 120
  }
};

// Global adminMode object, now part of global.config for consistency
global.adminMode = {
    enabled: configJson.adminOnly,
    adminUserIDs: configJson.ADMINBOT
};

// --- UTILS ---
const getThemeColors = () => {
  return {
    cra: chalk.hex("#FF0000"),
    cv: chalk.hex("#00FFFF"),
    cb: chalk.hex("#0000FF"),
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
    console.warn(`${chalk.hex("#FFA500")(`[${tag}]`)} ${message}`);
  }
};

const utils = {
  decryptState: (encryptedState, key) => {
    return encryptedState;
  },
  encryptState: (state, key) => {
    return state;
  },
  complete: () => {
    logger.log("Bot initialization complete!", "BOT");
  },
  humanDelay: async () => {
    const min = global.config.humanLikeDelay.min;
    const max = global.config.humanLikeDelay.max;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    logger.log(`Adding human-like delay of ${delay}ms...`, "DELAY");
    return new Promise(resolve => setTimeout(resolve, delay));
  },
  // --- IMPORTANT: Placeholder for findUid ---
  // You need to implement this function to resolve Facebook profile URLs to UIDs.
  // This typically requires scraping or using an external API.
  findUid: async (profileUrl) => {
    // This is a conceptual example. A real implementation is needed.
    logger.warn(`[WARNING] global.utils.findUid is a placeholder. It needs a proper implementation to resolve Facebook profile URLs.`);
    if (profileUrl.includes("facebook.com/profile.php?id=")) {
        const match = profileUrl.match(/id=(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
    }
    // For "facebook.com/username" type links, you would need a more robust method,
    // possibly involving an HTTP request to the URL and parsing the HTML for a meta tag
    // like <meta property="al:android:url" content="fb://profile/USER_ID">
    // Or other meta tags containing the ID.
    throw new Error("Could not find UID for the provided link. This feature requires a robust implementation of global.utils.findUid.");
  }
};

// Utility for managing thread-specific data, simplified for in-memory use
// In a real production bot, this would be backed by a database (e.g., Firestore)
function createThreadDataManager() {
    const threadDataStore = new Map(); // Map<threadID, Map<path, value>>

    return {
        // get(threadID, path) - Supports dot notation for nested objects
        get: async (threadID, path) => {
            let current = threadDataStore.get(threadID);
            if (!current) return undefined;

            const pathParts = path.split('.');
            for (const part of pathParts) {
                if (current && typeof current === 'object' && current.has(part)) {
                    current = current.get(part);
                } else {
                    return undefined;
                }
            }
            return current;
        },
        // set(threadID, value, path) - Supports dot notation for nested objects
        set: async (threadID, value, path) => {
            if (!threadDataStore.has(threadID)) {
                threadDataStore.set(threadID, new Map());
            }
            let current = threadDataStore.get(threadID);
            const pathParts = path.split('.');
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    current.set(part, value);
                } else {
                    if (!current.has(part) || !(current.get(part) instanceof Map)) {
                        current.set(part, new Map());
                    }
                    current = current.get(part);
                }
            }
        },
        // delete(threadID, path) - For cleanup (optional)
        delete: async (threadID, path) => {
            let current = threadDataStore.get(threadID);
            if (!current) return;

            const pathParts = path.split('.');
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    current.delete(part);
                } else {
                    if (!current.has(part) || !(current.get(part) instanceof Map)) {
                        return;
                    }
                    current = current.get(part);
                }
            }
            if (threadDataStore.get(threadID)?.size === 0) { // Check if the thread's map is empty
                threadDataStore.delete(threadID); // Clean up empty thread settings
            }
        }
    };
}


// --- LISTEN HANDLER ---
const listen = ({ api }) => {
  return async (error, event) => {
    if (error) {
      logger.err(`Listen error: ${error.message}`, "LISTENER_ERROR");
      if (error.error === 'Not logged in') {
        logger.warn("Bot session expired or invalid. (Hosting service will restart if main process exits)", "RELOGIN");
        // Removed process.exit(1) here to prevent self-restarts
      }
      return;
    }

    // If adminOnly is true, only process messages from ADMINBOT IDs
    if (global.adminMode.enabled && !global.adminMode.adminUserIDs.includes(event.senderID)) {
      return;
    }

    // --- Reaction Event Handling ---
    if (event.type === "message_reaction") {
        const reactionHandler = global.client.onReaction.get(event.messageID);
        if (reactionHandler) {
            const module = global.client.commands.get(reactionHandler.commandName) || global.client.events.get(reactionHandler.commandName);
            if (module && module.onReaction) {
                try {
                    logger.log(`Executing reaction handler for ${module.config.name} (message ID: ${event.messageID})`, "REACTION_EVENT");
                    await module.onReaction({
                        api,
                        event,
                        Reaction: reactionHandler, // Pass the stored reaction data
                        threadsData: global.data.threads,
                        getLang: global.getText // Assuming getText is the language function
                    });
                } catch (e) {
                    logger.err(`Error executing reaction handler for '${module.config.name}': ${e.message}`, "REACTION_EXEC_ERROR");
                }
            }
        }
        return; // Stop further processing for reaction events
    }

    // --- Message Event Handling (Commands & onChat events) ---
    if (event.type === "message" || event.type === "message_reply") { // Added message_reply type
      const lowerCaseBody = event.body ? event.body.toLowerCase() : '';
      const prefix = global.config.PREFIX;

      let commandFoundAndExecuted = false;

      // Handle the special 'prefix' command first (before any other commands)
      if (lowerCaseBody === "prefix") {
        await utils.humanDelay();
        return api.sendMessage(
          `🌐 System prefix: ${prefix}\n🛸 Your box chat prefix: ${prefix}`,
          event.threadID,
          event.messageID
        );
      }


      // --- Check for non-prefix commands ---
      for (const cmdNameLower of global.client.nonPrefixCommands) {
          if (lowerCaseBody === cmdNameLower || lowerCaseBody.startsWith(`${cmdNameLower} `)) {
              let foundCommand = null;
              for (const [key, cmdModule] of global.client.commands.entries()) {
                  if (key.toLowerCase() === cmdNameLower && (cmdModule.config.usePrefix === false || cmdModule.config.usePrefix === "both")) {
                      foundCommand = cmdModule;
                      break;
                  }
              }

              if (foundCommand) {
                  // Admin-only mode check for non-prefix commands
                  if (global.adminMode.enabled && !global.adminMode.adminUserIDs.includes(event.senderID) && foundCommand.config.hasPermssion !== 1) {
                       api.sendMessage("🔒 The bot is in Admin-only mode. You can't use commands right now.", event.threadID, event.messageID);
                       commandFoundAndExecuted = true;
                       break;
                  }

                  const promptText = lowerCaseBody.startsWith(`${cmdNameLower} `) ? event.body.slice(cmdNameLower.length + 1).trim() : "";
                  const args = promptText.split(/ +/).filter(Boolean);

                  if (foundCommand.config.hasPermssion !== undefined && foundCommand.config.hasPermssion > 0) {
                      if (foundCommand.config.hasPermssion === 1 && !global.adminMode.adminUserIDs.includes(event.senderID)) {
                          api.sendMessage("You don't have permission to use this command.", event.threadID, event.messageID);
                          commandFoundAndExecuted = true;
                          break;
                      }
                  }

                  try {
                      logger.log(`Executing non-prefix command: ${foundCommand.config.name}`, "NON_PREFIX_COMMAND"); // No prompt in log
                      await utils.humanDelay();
                      // Call run OR onStart depending on which is defined
                      if (foundCommand.run) {
                          await foundCommand.run({
                              api, event, args, global, prompt: promptText,
                              threadsData: global.data.threads, getLang: global.getText, commandName: foundCommand.config.name,
                              message: { reply: (msg, cb) => api.sendMessage(msg, event.threadID, event.messageID, cb), unsend: (mid) => api.unsendMessage(mid) } // Pass message object for compatibility
                          });
                      } else if (foundCommand.onStart) { // If onStart exists, call it
                          await foundCommand.onStart({
                              api, event, args, global, prompt: promptText,
                              threadsData: global.data.threads, getLang: global.getText, commandName: foundCommand.config.name,
                              message: { reply: (msg, cb) => api.sendMessage(msg, event.threadID, event.messageID, cb), unsend: (mid) => api.unsendMessage(mid) } // Pass message object for compatibility
                          });
                      }
                      commandFoundAndExecuted = true;
                  } catch (e) {
                      logger.err(`Error executing non-prefix command '${foundCommand.config.name}': ${e.message}`, "NON_PREFIX_EXEC");
                      api.sendMessage(`An error occurred while running the '${foundCommand.config.name}' command.`, event.threadID, event.messageID);
                      commandFoundAndExecuted = true;
                  }
                  break;
              }
          }
      }

      if (commandFoundAndExecuted) {
          // If a command was found and executed (prefix or non-prefix), we're done.
          // This prevents running onChat if a command was handled.
          return;
      }


      // --- Prefixed command logic ---
      if (event.body && event.body.startsWith(prefix)) {
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

        if (command.config.usePrefix === false) {
            return api.sendMessage(
              `⚠️ The command "${command.config.name}" does not require a prefix.\n` +
              `Just type "${command.config.name} ${command.config.guide ? command.config.guide.en.split('OR')[0].trim() : ''}" to use it.`, // Adjusted for guide.en
              event.threadID,
              event.messageID
            );
        }

        // Admin-only mode check for prefixed commands
        if (global.adminMode.enabled && !global.adminMode.adminUserIDs.includes(event.senderID) && command.config.hasPermssion !== 1) {
            return api.sendMessage("🔒 The bot is in Admin-only mode. You can't use commands right now.", event.threadID, event.messageID);
        }

        try {
          if (command.config.hasPermssion !== undefined && command.config.hasPermssion > 0) {
            if (command.config.hasPermssion === 1 && !global.adminMode.adminUserIDs.includes(event.senderID)) {
              api.sendMessage("You don't have permission to use this command.", event.threadID, event.messageID);
              return;
            }
          }

          logger.log(`Executing command: ${command.config.name}`, "COMMAND");
          await utils.humanDelay();
          const prefixedPrompt = args.join(" ");
          // Call run OR onStart depending on which is defined
          if (command.run) {
              await command.run({
                  api, event, args, global, prompt: prefixedPrompt,
                  threadsData: global.data.threads, getLang: global.getText, commandName: command.config.name,
                  message: { reply: (msg, cb) => api.sendMessage(msg, event.threadID, event.messageID, cb), unsend: (mid) => api.unsendMessage(mid) } // Pass message object for compatibility
              });
          } else if (command.onStart) { // If onStart exists, call it
              await command.onStart({
                  api, event, args, global, prompt: prefixedPrompt,
                  threadsData: global.data.threads, getLang: global.getText, commandName: command.config.name,
                  message: { reply: (msg, cb) => api.sendMessage(msg, event.threadID, event.messageID, cb), unsend: (mid) => api.unsendMessage(mid) } // Pass message object for compatibility
              });
          }
        } catch (e) {
          logger.err(`Error executing command '${command.config.name}': ${e.message}`, "COMMAND_EXEC");
          api.sendMessage(`An error occurred while running the '${command.config.name}' command.`, event.threadID, event.messageID);
        }
        return; // Command handled, stop further message processing
      }

      // --- onChat Event Handling for all non-command messages ---
      global.client.events.forEach(async (eventModule) => {
          // Check if the eventModule handles 'message' type events and has an onChat method
          if (eventModule.config.eventType && eventModule.config.eventType.includes("message") && eventModule.onChat) {
              try {
                  logger.log(`Executing onChat event for: ${eventModule.config.name}`, "ON_CHAT_EVENT");
                  // No human delay for onChat to keep it responsive, adjust if needed
                  await eventModule.onChat({
                      api,
                      event,
                      threadsData: global.data.threads, // Pass threadsData
                      getLang: global.getText, // Pass getLang
                      commandName: eventModule.config.name // Pass commandName
                  });
              } catch (e) {
                  logger.err(`Error executing onChat event for '${eventModule.config.name}': ${e.message}`, "ON_CHAT_EXEC_ERROR");
              }
          }
      });
    }
  };
};

// --- CUSTOM SCRIPT ---
const customScript = ({ api }) => {
  logger.log("Running custom script...", "CUSTOM");

  // Directly define the config for acceptPending here, no autoStuffConfig object
  const acceptPendingConfig = {
    status: true,
    time: 30,
    note: 'Approve waiting messages after a certain time',
  };

  function acceptPending(config) {
    if (config.status) {
      cron.schedule(`*/${config.time} * * * *`, async () => {
        try {
          const list = [
            ...(await api.getThreadList(1, null, ['PENDING'])),
            ...(await api.getThreadList(1, null, ['OTHER'])),
          ];
          if (list[0]) {
            await utils.humanDelay();
            api.sendMessage('You have been approved for the queue. (This is an automated message)', list[0].threadID);
          }
        } catch (e) {
          logger.err(`Error accepting pending messages: ${e.message}`, "AUTO_PENDING");
        }
      });
    }
  }

  // Call acceptPending directly with its config
  acceptPending(acceptPendingConfig);

  // Random activity remains unchanged
  if (global.config.randomActivity.status) {
    cron.schedule('*/1 * * * *', async () => {
      const minInterval = global.config.randomActivity.intervalMin;
      const maxInterval = global.config.randomActivity.intervalMax;
      const randomMinutes = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

      if (Date.now() - global.client.lastActivityTime > randomMinutes * 60 * 1000) {
        try {
          logger.log("Performing random human-like activity...", "ACTIVITY");
          const threadList = await api.getThreadList(5, null, ['INBOX']);
          if (threadList.length > 0) {
            const randomThread = threadList[Math.floor(Math.random() * threadList.length)];

            const activities = [
              async () => {
                await api.setOptions({ online: false });
                logger.log("Temporarily set bot offline.", "ACTIVITY");
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
                await api.setOptions({ online: true });
                logger.log("Set bot back online.", "ACTIVITY");
              },
              async () => {
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
              global.client.lastActivityTime = Date.now();
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
    `The "removeSt" property is set true in the config.json. Therefore, the Appstate was cleared effortlessly! You can now place a new one in the same directory.` +
    `\n\nExiting in 10 seconds. Please re-run the bot with a new appstate.`;
  await delayedLog(message);
};

if (configJson.removeSt) {
  fs.writeFileSync(fbstate, sign, { encoding: "utf8", flag: "w" });
  showMessage();
  setTimeout(() => {
    process.exit(0);
  }, 10000);
}

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
  if (configJson.UPDATE.Package && !configJson.UPDATE.EXCLUDED.includes(dependency)) {
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
    logger.log('Automatic package updates are disabled in config.json.', 'UPDATE');
  }
}

global.client = {
  commands: new Map(),
  events: new Map(), // General event handlers
  cooldowns: new Map(),
  eventRegistered: [],
  handleSchedule: [],
  handleReaction: new Map(), // NEW: Map to store reaction handlers by messageID
  handleReply: [],
  mainPath: process.cwd(),
  configPath: 'config.json',
  getTime: function (option) {
    switch (option) {
      case "seconds": return `${moment.tz("Asia/Dhaka").format("ss")}`;
      case "minutes": return `${moment.tz("Asia/Dhaka").format("mm")}`;
      case "hours": return `${moment.tz("Asia/Dhaka").format("HH")}`;
      case "date": return `${moment.tz("Asia/Dhaka").format("DD")}`;
      case "month": return `${moment.tz("Asia/Dhaka").format("MM")}`;
      case "year": return `${moment.tz("Asia/Dhaka").format("YYYY")}`;
      case "fullHour": return `${moment.tz("Asia/Dhaka").format("HH:mm:ss")}`;
      case "fullYear": return `${moment.tz("Asia/Dhaka").format("DD/MM/YYYY")}`;
      case "fullTime": return `${moment.tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY")}`;
      default: return moment.tz("Asia/Dhaka").format();
    }
  },
  timeStart: Date.now(),
  lastActivityTime: Date.now(),
  nonPrefixCommands: new Set(),

  loadCommand: async function(commandFileName) {
    const commandsPath = path.join(global.client.mainPath, 'modules', 'commands');
    const fullPath = path.resolve(commandsPath, commandFileName);

    try {
      if (require.cache[require.resolve(fullPath)]) {
        delete require.cache[require.resolve(fullPath)];
        logger.log(`Cleared cache for: ${commandFileName}`, "CMD_CACHE");
      }

      const module = require(fullPath);
      const { config } = module;

      // --- FLEXIBLE VALIDATION ---
      // 1. Ensure config object exists
      if (!config || typeof config !== 'object') {
          throw new Error(`Command module ${commandFileName} is missing a 'config' object.`);
      }
      // 2. Ensure 'name' is always present
      if (!config.name || typeof config.name !== 'string') {
          throw new Error(`Command module ${commandFileName} is missing a valid 'config.name' property.`);
      }
      // 3. Ensure an execution function (run or onStart) is present
      if (!module.run && !module.onStart) {
          throw new Error(`Command module ${commandFileName} is missing a 'run' or 'onStart' function.`);
      }

      // Provide defaults if optional properties are missing
      config.commandCategory = config.commandCategory || "Uncategorized"; // Default category
      config.usePrefix = config.hasOwnProperty('usePrefix') ? config.usePrefix : true; // Default to true if not specified

      // If 'category' was used instead of 'commandCategory', map it for backward compatibility
      if (config.category && !config.commandCategory) {
          config.commandCategory = config.category;
          logger.warn(`Command ${config.name} is using deprecated 'config.category'. Please use 'config.commandCategory'.`, "CMD_LOAD_WARN");
      }
      // --- END FLEXIBLE VALIDATION ---


      if (global.client.commands.has(config.name)) {
        logger.warn(`[ COMMAND ] Overwriting existing command: "${config.name}" (from ${commandFileName})`, "COMMAND_LOAD");
        if (global.client.nonPrefixCommands.has(config.name.toLowerCase())) {
            global.client.nonPrefixCommands.delete(config.name.toLowerCase());
        }
        global.client.commands.delete(config.name);
      }

      if (config.usePrefix === false || config.usePrefix === "both") {
          global.client.nonPrefixCommands.add(config.name.toLowerCase());
      }
      // Execute onLoad function if it exists
      if (module.onLoad) {
        try {
          if (global.client.api) {
            await module.onLoad({
                api: global.client.api,
                threadsData: global.data.threads, // Pass threadsData to onLoad
                getLang: global.getText, // Pass getLang
                commandName: config.name
            });
          } else {
            logger.warn(`API not yet available for onLoad of ${commandFileName}. If this module needs API, it might not work correctly.`, "CMD_LOAD_WARN");
            await module.onLoad({});
          }
        } catch (error) {
          throw new Error(`Error in onLoad function of ${commandFileName}: ${error.message}`);
        }
      }

      if (module.onChat || module.onReaction) { // Register if it has any event-like function
          if (!global.client.eventRegistered.includes(config.name)) {
              global.client.eventRegistered.push(config.name);
          }
      } else if (!module.onChat && !module.onReaction && global.client.eventRegistered.includes(config.name)) {
          global.client.eventRegistered = global.client.eventRegistered.filter(name => name !== config.name);
      }

      global.client.commands.set(config.name, module);
      logger.log(`${chalk.hex("#00FF00")(`LOADED`)} ${chalk.cyan(config.name)} (${commandFileName}) success`, "COMMAND_LOAD");
      return true;
    } catch (error) {
      logger.err(`${chalk.hex("#FF0000")(`FAILED`)} to load ${chalk.yellow(commandFileName)}: ${error.message}`, "COMMAND_LOAD");
      return false;
    }
  }
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
  threads: createThreadDataManager() // NEW: Global thread data manager
};

global.utils = utils;
global.loading = logger;
global.nodemodule = {};
global.config = configJson;
global.configModule = {};
global.moduleData = [];
global.language = {};
global.account = {};

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
translate.translateTo=🌐 Translate from %1 to %2
translate.invalidArgument=❌ Invalid argument, please choose on or off
translate.turnOnTransWhenReaction=✅ Turn on translate message when reaction, try to react "${defaultEmojiTranslate}" to any message to translate it (not support bot message)\\n Only translate message after turn on this feature
translate.turnOffTransWhenReaction=✅ Turn off translate message when reaction
translate.inputEmoji=🌀 Please react to this message to set that emoji as emoji to translate message
translate.emojiSet=✅ Emoji to translate message is set to %1
translate.guide=    {pn} <text>: Translate text to the language of your chat box or the default language of the bot\\n    {pn}  -> <ISO 639-1>: Translate text to the desired language\\n    or you can reply a message to translate the content of that message\\n    Example:\\n     {pn} hello -> vi\\n    {pn} -r [on | off]: Turn on or off the automatic translation mode when someone reacts to the message\\n    {pn} -r set : Set the emoji to translate the message in your chat group
uid.syntaxError=Please tag the person you want to view their UID, provide a profile link, or leave it blank to view your own UID.
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
  if (typeof global.language == "undefined") global.language = {}; // Ensure global.language exists
  if (typeof global.language[head] == "undefined")
    global.language[head] = {};
  global.language[head][key] = value;
}


global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) {
    logger.warn(`Language key not found: ${args[0]}`, "LANG_WARN");
    return `[Missing lang key: ${args[0]}.${args[1]}]`;
  }
  var text = langText[args[0]][args[1]];
  if (typeof text === "undefined") {
    logger.warn(`Text key not found: ${args[1]} for language ${args[0]}`, "LANG_WARN");
    return `[Missing text: ${args[0]}.${args[1]}]`;
  }
  for (var i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, "g");
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

async function onBot() {
  let loginData;
  const appStateFile = resolve(
    join(global.client.mainPath, configJson.APPSTATEPATH || "appstate.json")
  );

  let appState = null;
  try {
    const rawAppState = fs.readFileSync(appStateFile, "utf8");
    if (rawAppState[0] !== "[") {
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
    } else if (configJson.useEnvForCredentials && process.env.FCA_EMAIL && process.env.FCA_PASSWORD) {
      logger.log("Attempting to log in with email/password from environment variables.", "LOGIN");
      configJson.email = process.env.FCA_EMAIL;
      configJson.password = process.env.FCA_PASSWORD;
    } else {
      logger.err("No valid appstate or credentials found. Exiting.", "LOGIN");
      return setTimeout(() => process.exit(0), 5000);
    }
  }

  if (appState) {
    loginData = { appState: appState };
  } else if (configJson.useEnvForCredentials && process.env.FCA_EMAIL && process.env.FCA_PASSWORD) {
    loginData = {
      email: process.env.FCA_EMAIL,
      password: process.env.FCA_PASSWORD,
    };
  } else if (configJson.email && configJson.password) {
      loginData = {
          email: configJson.email,
          password: configJson.password,
      };
  } else {
      logger.err("No valid appstate or credentials found. Exiting.", "LOGIN");
      return setTimeout(() => process.exit(0), 5000);
  }

  const fcaLoginOptions = {
    ...global.config.FCAOption,
    forceLogin: global.config.FCAOption.forceLogin,
    listenEvents: global.config.FCAOption.listenEvents,
    autoMarkDelivery: global.config.FCAOption.autoMarkDelivery,
    autoMarkRead: global.config.FCAOption.autoMarkRead,
    logLevel: global.config.FCAOption.logLevel,
    selfListen: global.config.FCAOption.selfListen,
    online: global.config.FCAOption.online,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    autoReconnect: true,
    autoRestore: true,
    syncUp: true,
    delay: 500
  };

  login(loginData, fcaLoginOptions, async (err, api) => {
    if (err) {
      console.error(err);
      if (err.error === 'login-approval' || err.error === 'Login approval needed') {
          logger.err("Login approval needed. Please approve the login from your Facebook account in a web browser, then try again.", "LOGIN_FAILED");
      } else if (err.error === 'Incorrect username/password.') {
          logger.err("Incorrect email or password. Please check your config.json or environment variables (FCA_EMAIL, FCA_PASSWORD).", "LOGIN_FAILED");
      } else if (err.error === 'The account is temporarily unavailable.') {
          logger.err("The account is temporarily unavailable. This might be a temporary Facebook block. Try logging into Facebook in a browser to clear any flags, then try again.", "LOGIN_FAILED");
      } else if (err.error.includes('error retrieving userID') || err.error.includes('from an unknown location')) {
          logger.err(`Facebook login blocked from an unknown location. You must log into your Facebook account directly in a web browser and clear any security checks, then re-deploy the bot. Error: ${err.message || JSON.stringify(err)}`, "LOGIN_FAILED");
      }
      else {
          logger.err(`Fatal login error: ${err.message || JSON.stringify(err)}. Try logging into Facebook in a browser to resolve security issues.`, "LOGIN_FAILED");
      }
      return setTimeout(() => process.exit(0), 5000);
    }

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

    if (newAppState && Array.isArray(newAppState)) {
        global.account.cookie = newAppState.map((i) => (i = i.key + "=" + i.value)).join(";");
    } else {
        logger.warn("Could not set global.account.cookie. New appstate was not an array or was not retrieved.", "APPSTATE");
        global.account.cookie = "";
    }

    global.client.api = api;
    global.config.version = configJson.version;

    // --- Add Administrator Example (from previous request) ---
    // IMPORTANT: Replace "YOUR_NEW_ADMIN_FACEBOOK_ID" with the actual Facebook User ID you want to add as an admin.
    // This will add the ID to the ADMINBOT array in memory when the bot starts.
    // For permanent addition, you would typically edit this ID directly in the config.json file
    // or implement a system to write back to the config file (not covered here).
    const newAdminIDOnStartup = "YOUR_NEW_ADMIN_FACEBOOK_ID"; // <<< REMEMBER TO CHANGE THIS
    if (newAdminIDOnStartup !== "YOUR_NEW_ADMIN_FACEBOOK_ID" && !configJson.ADMINBOT.includes(newAdminIDOnStartup)) {
      configJson.ADMINBOT.push(newAdminIDOnStartup);
      global.adminMode.adminUserIDs.push(newAdminIDOnStartup); // Also update adminMode if it's separate
      console.log(`Added admin ${newAdminIDOnStartup} successfully on startup.`);
    }
    // --- End Add Administrator Example ---


    const commandsPath = `${global.client.mainPath}/modules/commands`;
    const eventsPath = `${global.client.mainPath}/modules/events`;
    const includesCoverPath = `${global.client.mainPath}/includes/cover`;

    fs.ensureDirSync(commandsPath);
    fs.ensureDirSync(eventsPath);
    fs.ensureDirSync(includesCoverPath);
    logger.log("Ensured module directories exist.", "SETUP");

    const listCommandFiles = readdirSync(commandsPath).filter(
      (commandFile) =>
        commandFile.endsWith(".js") &&
        !global.config.commandDisabled.includes(commandFile)
    );
    console.log(cv(`\n` + `──LOADING COMMANDS─●`));
    for (const commandFile of listCommandFiles) {
      await global.client.loadCommand(commandFile);
    }

    const events = readdirSync(eventsPath).filter(
      (ev) =>
        ev.endsWith(".js") && !global.config.eventDisabled.includes(ev)
    );
    console.log(cv(`\n` + `──LOADING EVENTS─●`));
    for (const ev of events) {
      try {
        const eventModule = require(join(eventsPath, ev));
        const { config, onLoad, run, onChat, onReaction } = eventModule; // Destructure onChat and onReaction

        // Event module validation (similar flexibility as commands)
        if (!config || typeof config !== 'object') {
            logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} fail: Missing a 'config' object.`, "EVENT");
            continue;
        }
        if (!config.name || typeof config.name !== 'string') {
            logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} fail: Missing a valid 'config.name' property.`, "EVENT");
            continue;
        }
        // Events don't strictly need a 'run' but should have at least one handler or eventType
        if (!config.eventType || (!run && !onChat && !onReaction)) {
            logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} fail: Missing 'config.eventType' or a valid function (run/onChat/onReaction).`, "EVENT");
            continue;
        }


        if (onLoad) {
          try {
            await onLoad({
                api,
                threadsData: global.data.threads,
                getLang: global.getText,
                commandName: config.name
            });
          } catch (error) {
            throw new Error("Unable to load the onLoad function of the event.");
          }
        }
        global.client.events.set(config.name, eventModule); // Store the entire module
        logger.log(`${cra(`LOADED`)} ${cb(config.name)} success`, "EVENT");
      } catch (error) {
        logger.err(`${chalk.hex("#ff7100")(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} fail ` + error, "EVENT");
      }
    }

    global.client.listenMqtt = global.client.api.listenMqtt(listen({ api: global.client.api }));
    customScript({ api: global.client.api });
    utils.complete();

    if (global.config.ADMINBOT && global.config.ADMINBOT.length > 0) {
      const adminID = global.config.ADMINBOT[0];
      try {
        await utils.humanDelay();
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

const PORT = process.env.PORT || 3000;

function startWebServer() {
  const app = express();

  app.get('/', (req, res) => {
    res.status(200).send('Bot is awake and running!');
  });

  app.listen(PORT, '0.0.0.0', () => {
    logger.log(`Uptime Robot endpoint listening on port ${PORT}`, "SERVER");
  }).on('error', (err) => {
    logger.err(`Failed to start Express server: ${err.message}`, "SERVER_ERROR");
    // If the web server fails to start, it's a critical error, so we exit.
    process.exit(1);
  });
}

startWebServer();
onBot();
