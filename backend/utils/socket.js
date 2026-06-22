const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("joinUserRoom", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their private room`);
    });

    socket.on("sendMessage", ({ receiverId, sender, text, image }) => {
      const messageData = {
        sender,
        text,
        image,
        timestamp: new Date(),
      };
      io.to(receiverId).emit("receiveMessage", messageData);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  return io;
};

module.exports = { initSocket };
