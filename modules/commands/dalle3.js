const axios = require('axios');
const fs = require('fs-extra'); // Make sure you have fs-extra installed: npm install fs-extra
const path = require('path');

module.exports = {
    config: {
        name: "dalle3",
        aliases: ["dalle"],
        version: "1.0",
        author: "Hassan", // Your author name
        countDown: 15, // Cooldown in seconds
        role: 0, // 0 for everyone, 1 for admin
        shortDescription: "Generate images by Dalle3",
        longDescription: "Generate images by Dalle3",
        commandCategory: "download", // FIX: Changed from 'category' to 'commandCategory' to match index.js validation
        guide: {
            en: "{pn} prompt"
        }
    },

    // This command uses 'onStart' as its main execution function, which index.js now supports
    onStart: async function ({ api, event, args, message }) { // Added 'message' to params for compatibility
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("Please provide a prompt to generate an image.", threadID, messageID);
        }

        let waitingMessageID;
        try {
            // Send "Please wait..." message
            api.sendMessage("Please wait while I generate the image...", threadID, messageID, (err, info) => {
                if (!err) waitingMessageID = info.messageID;
            });

            // Make the API call to your Dalle3 service
            const response = await axios.get(`https://hassan-dalle-api.onrender.com/dalle?prompt=${encodeURIComponent(prompt)}`);

            if (response.status === 200 && response.data.generated_image) {
                const imageUrl = response.data.generated_image;
                const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

                // Ensure the cache directory exists
                const cacheDir = path.join(__dirname, 'cache');
                await fs.ensureDir(cacheDir);

                const imgPath = path.join(cacheDir, `dalle3_generated_${Date.now()}.jpg`); // Use a unique filename
                await fs.outputFile(imgPath, imgResponse.data); // Use fs-extra's outputFile for convenience

                // Send the image back to the user
                await api.sendMessage({
                    body: "✅ | Image generated",
                    attachment: fs.createReadStream(imgPath)
                }, threadID, messageID, async (err) => {
                    if (err) {
                        console.error("Error sending generated image:", err);
                        api.sendMessage("Failed to send the generated image.", threadID);
                    }
                    // Clean up the cached image file after sending
                    fs.unlink(imgPath).catch(e => console.error("Error deleting cached image:", e));
                });

            } else {
                // If API call was successful but no image was generated or unexpected status
                throw new Error(response.data.error || "Failed to generate image from API.");
            }

        } catch (error) {
            console.error("Dalle3 command error:", error); // Log the full error for debugging
            api.sendMessage(`❌ Image generation failed! Error: ${error.message}. Please check your prompt or try again later.`, threadID, messageID);
        } finally {
            // Unsend the "Please wait..." message if it was sent
            if (waitingMessageID) {
                api.unsendMessage(waitingMessageID).catch(e => console.error("Error unsend waiting message:", e));
            }
        }
    }
};
