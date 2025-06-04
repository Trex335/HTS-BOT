
          module.exports.config = {
            name: "welcome",
            eventType: ["log:subscribe"],
            version: "1.0.0",
            credits: "Your Name",
            description: "Welcomes new members.",
          };
          module.exports.run = async ({ api, event, global }) => {
            if (event.logMessageType === 'log:subscribe' && event.logMessageData.addedParticipants) {
              const threadInfo = await api.getThreadInfo(event.threadID); // Get thread name
              const addedParticipants = event.logMessageData.addedParticipants;
              const botID = api.getCurrentUserID();

              let welcomeMessage = "Hello ";
              let isBotAdded = false;

              for (const participant of addedParticipants) {
                if (participant.userID === botID) {
                  isBotAdded = true;
                } else {
                  welcomeMessage += `${participant.fullName}, `;
                }
              }

              if (isBotAdded) {
                api.sendMessage(`Hello everyone! Thanks for inviting me to ${threadInfo.threadName || 'this group'}. Type '${global.config.PREFIX}help' to see my commands.`, event.threadID);
              } else if (addedParticipants.length > 0) {
                welcomeMessage = welcomeMessage.slice(0, -2); // Remove trailing comma and space
                welcomeMessage += `! Welcome to the group ${threadInfo.threadName || ''}!`;
                api.sendMessage(welcomeMessage, event.threadID);
              }
            }
          };
        