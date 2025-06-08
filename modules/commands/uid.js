// modules/commands/uid.js
const { findUid } = global.utils; // Assuming global.utils.findUid exists and correctly resolves UIDs from links
const regExCheckURL = /^(http|https):\/\/[^ "]+$/; // Regex to validate URLs

module.exports = {
	config: {
		name: "uid",
		version: "1.3",
		author: "Hassan",
		countDown: 5, // Cooldown in seconds
		role: 0, // 0 = all users, 1 = admin, 2 = bot owner
		description: {
			en: "View Facebook user ID of a user."
		},
		category: "info",
		guide: {
			en: "  • {pn}: View your own Facebook user ID."
				+ "\n  • {pn} @tag: View Facebook user ID of tagged people."
				+ "\n  • {pn} <profile link>: View Facebook user ID from a profile link."
				+ "\n  • Reply to someone's message with the command to view their Facebook user ID."
		}
	},

	langs: {
		en: {
			syntaxError: "Please tag the person you want to view their UID, provide a profile link, or leave it blank to view your own UID."
		}
	},

	onStart: async function ({ message, event, args, getLang }) {
		// Scenario 1: Reply to a message
		if (event.messageReply) {
			return message.reply(`The UID of the replied message sender is: ${event.messageReply.senderID}`);
		}

		// Scenario 2: No arguments (get sender's own UID)
		if (!args[0]) {
			return message.reply(`Your Facebook user ID is: ${event.senderID}`);
		}

		// Scenario 3: Argument is a URL (profile link)
		if (args[0].match(regExCheckURL)) {
			let msg = 'Facebook User IDs:\n';
			for (const link of args) {
				try {
					const uid = await findUid(link); // Assuming findUid is an asynchronous utility function
					msg += `  ${link} => ${uid}\n`;
				} catch (e) {
					msg += `  ${link} (ERROR) => Could not retrieve UID (${e.message})\n`;
				}
			}
			return message.reply(msg);
		}

		// Scenario 4: Mentions (tagged users)
		const { mentions } = event;
		let msg = "";
		if (Object.keys(mentions).length > 0) {
			msg = "Facebook User IDs of tagged users:\n";
			for (const id in mentions) {
				msg += `  ${mentions[id].replace("@", "")}: ${id}\n`;
			}
			return message.reply(msg);
		}

		// Fallback: If no valid scenario, show syntax error
		return message.reply(getLang("syntaxError"));
	}
};
