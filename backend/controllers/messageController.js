const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");
const sendNotification = require("../utils/sendnotification");

const createMessage = async (req, res) => {
  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] Message - Score: ${req.recaptchaScore}, User: ${req.user.id}`);
  }

  const { text, receiver: receiverId } = req.body;
  const senderId = req.user.id;
  const io = req.app.get("io");

  try {
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      text: text || "[Image]",
      image: req.file?.path || null,
    });

    await message.save();

    // Emit message via socket
    if (io) {
      io.to(receiverId).emit("receiveMessage", {
        sender: message.sender,
        receiver: message.receiver,
        text: message.text,
        image: message.image,
        timestamp: message.timestamp,
      });

    }
    io.to(senderId).emit("receiveMessage", {
      sender: message.sender,
      receiver: receiverId,
      text: message.text,
      image: message.image,
      timestamp: message.timestamp,
    });

    // Optional: Push notification
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(senderId);

    if (receiver?.fcmToken) {
      await sendNotification(
        receiver.fcmToken,
        `New message from ${sender.name}`,
        message.text,
        { type: "chat",
          senderId: senderId
        }
      );
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMessagesWithUser = async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.otherUserId;

  try {
    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: userId,
        read: false,
      },
      { $set: { read: true } }
    );

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ timestamp: 1 })
      .populate("sender", "name profilePhoto");

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

const getChatSummary = async (req, res) => {
  // const userId = req.user.id;
  const userId = new mongoose.Types.ObjectId(req.user.id); // cast to ObjectId

  try {
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          lastMessage: { $first: "$text" },
          lastImage: { $first: "$image" },
          lastTimestamp: { $first: "$timestamp" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", userId] },
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        },
      },
    ]);

    const chatSummaries = await Promise.all(
      messages.map(async (msg) => {
        const user = await User.findById(msg._id).select("name profilePhoto");
        return {
          userId: msg._id,
          name: user?.name || "Unknown",
          profilePhoto: user?.profilePhoto || null,
          lastMessage: msg.lastMessage,
          lastImage: msg.lastImage,
          lastTimestamp: msg.lastTimestamp,
          unreadCount: msg.unreadCount || 0
        };
      })
    );

    chatSummaries.sort(
      (a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    );

    res.json(chatSummaries);
  } catch (error) {
    console.error("Error getting chat summary:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createMessage,
  getMessagesWithUser,
  getChatSummary,
};
