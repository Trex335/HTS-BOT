module.exports = {
	config: {
		name: "setrole",
		version: "1.4",
		author: "NTKhang (Adapted by Hassan)", // Added adaptation note
		countDown: 5,
		role: 2,
		description: {
			vi: "Chỉnh sửa role của lệnh (những lệnh có role < 2)",
			en: "Edit role of command (commands with role < 2)"
		},
		category: "info",
		guide: {
			vi: "   {pn} <commandName> <new role>: set role mới cho lệnh"
				+ "\n   Với:"
				+ "\n   + <commandName>: tên lệnh"
				+ "\n   + <new role>: role mới của lệnh với:"
				+ "\n   + <new role> = 0: lệnh có thể được sử dụng bởi mọi thành viên trong nhóm"
				+ "\n   + <new role> = 1: lệnh chỉ có thể được sử dụng bởi quản trị viên"
				+ "\n   + <new role> = default: reset role lệnh về mặc định"
				+ "\n   Ví dụ:"
				+ "\n    {pn} rank 1: (lệnh rank sẽ chỉ có thể được sử dụng bởi quản trị viên)"
				+ "\n    {pn} rank 0: (lệnh rank sẽ có thể được sử dụng bởi mọi thành viên trong nhóm)"
				+ "\n    {pn} rank default: reset về mặc định"
				+ "\n—————"
				+ "\n   {pn} [viewrole|view|show]: xem role của những lệnh đã chỉnh sửa",
			en: "   {pn} <commandName> <new role>: set new role for command"
				+ "\n   With:"
				+ "\n   + <commandName>: command name"
				+ "\n   + <new role>: new role of command with:"
				+ "\n   + <new role> = 0: command can be used by all members in group"
				+ "\n   + <new role> = 1: command can be used by admin only"
				+ "\n   + <new role> = default: reset role of command to default"
				+ "\n   Example:"
				+ "\n    {pn} rank 1: (command rank can be used by admin only)"
				+ "\n    {pn} rank 0: (command rank can be used by all members in group)"
				+ "\n    {pn} rank default: reset to default"
				+ "\n—————"
				+ "\n   {pn} [viewrole|view|show]: view role of edited commands"
		}
	},

	langs: {
		vi: {
			noEditedCommand: "✅ Hiện tại nhóm bạn không có lệnh nào được chỉnh sửa role",
			editedCommand: "⚠️ Những lệnh trong nhóm bạn đã chỉnh sửa role:\n",
			noPermission: "❗ Chỉ có quản trị viên mới có thể thực hiện lệnh này",
			commandNotFound: "Không tìm thấy lệnh \"%1\"",
			noChangeRole: "❗ Không thể thay đổi role của lệnh \"%1\"",
			resetRole: "Đã reset role của lệnh \"%1\" về mặc định",
			changedRole: "Đã thay đổi role của lệnh \"%1\" thành %2"
		},
		en: {
			noEditedCommand: "✅ Your group has no edited command",
			editedCommand: "⚠️ Your group has edited commands:\n",
			noPermission: "❗ Only admin can use this command",
			commandNotFound: "Command \"%1\" not found",
			noChangeRole: "❗ Can't change role of command \"%1\"",
			resetRole: "Reset role of command \"%1\" to default",
			changedRole: "Changed role of command \"%1\" to %2"
		}
	},

	onStart: async function ({ api, event, args, global, threadsData, getLang, message }) { // Added 'api', 'global', 'message' to params
		const { commands } = global.client; // Use global.client.commands

		// Access threadsData from global.data as per your bot's setup
		const setRole = await global.data.threads.get(event.threadID, "data.setRole");
        // Initialize setRole if it's null/undefined
        const currentSetRole = setRole || {};


		if (["view", "viewrole", "show"].includes(args[0]?.toLowerCase())) { // Ensure args[0] exists before toLowerCase
			if (!currentSetRole || Object.keys(currentSetRole).length === 0)
				return api.sendMessage(getLang("noEditedCommand"), event.threadID, event.messageID);
			let msg = getLang("editedCommand");
			for (const cmd in currentSetRole) msg += `- ${cmd} => ${currentSetRole[cmd]}\n`;
			return api.sendMessage(msg, event.threadID, event.messageID);
		}

		let commandName = (args[0] || "").toLowerCase();
		let newRole = args[1];

        // Custom SyntaxError response for your bot
		if (!commandName || (isNaN(newRole) && newRole !== "default")) {
            return api.sendMessage(
                `Invalid usage. Please use: \n${global.config.PREFIX}setrole <commandName> <new role>` +
                `\nExample: ${global.config.PREFIX}setrole rank 1` +
                `\nOr: ${global.config.PREFIX}setrole view`,
                event.threadID, event.messageID
            );
        }

        // Check if the user is an admin (role is defined in config)
        // Your bot's admin check: global.adminMode.adminUserIDs.includes(event.senderID)
        // This command itself has role: 1, so the framework should enforce it.
        // However, an explicit check here can also be helpful.
        if (!global.adminMode.adminUserIDs.includes(event.senderID)) {
            return api.sendMessage(getLang("noPermission"), event.threadID, event.messageID);
        }


		let command = null;
        // Search for the command by name, then check nonPrefixCommands if needed
        for (const [cmdKey, cmdModule] of commands.entries()) {
            if (cmdKey.toLowerCase() === commandName) {
                command = cmdModule;
                break;
            }
        }
        // Also check if it's a non-prefix command (though setrole only applies to actual commands)
        if (!command) {
            for (const [cmdKey, cmdModule] of commands.entries()) {
                if (cmdModule.config.usePrefix === false && cmdKey.toLowerCase() === commandName) {
                    command = cmdModule;
                    break;
                }
            }
        }

		if (!command)
			return api.sendMessage(getLang("commandNotFound", commandName), event.threadID, event.messageID);

		commandName = command.config.name; // Get the canonical name

		// Protect commands with role > 1 (e.g., bot owner commands)
		if (command.config.role > 1)
			return api.sendMessage(getLang("noChangeRole", commandName), event.threadID, event.messageID);

		let Default = false;
        // Check if newRole is "default" or if it's trying to set to the command's original default role
		if (newRole === "default" || (parseInt(newRole) === command.config.role && newRole !== "default")) {
			Default = true;
			newRole = command.config.role; // This is the original default role
		}
		else {
			newRole = parseInt(newRole);
            if (isNaN(newRole) || (newRole !== 0 && newRole !== 1)) { // Ensure newRole is 0 or 1
                return api.sendMessage("Invalid role. Please use 0 (all users) or 1 (admin only), or 'default'.", event.threadID, event.messageID);
            }
		}

        // Update the setRole object
		currentSetRole[commandName] = newRole;
		if (Default) {
            // If setting to default, remove it from the stored setRole data
			delete currentSetRole[commandName];
        }
		await global.data.threads.set(event.threadID, currentSetRole, "data.setRole");

		api.sendMessage("✅ " + (Default === true ? getLang("resetRole", commandName) : getLang("changedRole", commandName, newRole)), event.threadID, event.messageID);
	}
};
