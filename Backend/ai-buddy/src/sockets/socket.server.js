const { Server, Socket } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const agent = require("../agent/agent");

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  io.use((Socket, next) => {
    const cookies = Socket.handshake.headers?.cookie;

    const { token } = cookie ? cookie.parse(cookies) : {};

    if(!token) {
        return next(new Error("Token not found"));
    };

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      Socket.user = decoded;
      Socket.token = token;

      next();
    } catch (error) {
        next(new Error("Invalid Token"));
    };

  });

  io.on("connection", (Socket) => {
    console.log("a user connected");
  
    Socket.on('message', async (data) => {
      const agentResponse = await agent.invoke({
        role: "user",
        content: data
      }, {
        metadata: {
          token: Socket.token
        }
      });
        const lastMessage = agentResponse.messages[agentResponse.messages.length - 1];
        Socket.emit("message", lastMessage.content);
    });
  });
};

module.exports = initSocketServer;
