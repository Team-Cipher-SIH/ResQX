const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ResponseTeam = require("../models/responseteam.model");

let io = null;

function setupSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`User connected: ${user.name} (${user._id}) [${user.role} / ${user.authorityLevel || "none"}]`);

    // 1. Always join personal user room
    socket.join(`user:${user._id}`);

    // 2. Join jurisdiction rooms based on strict role / authorityLevel mapping
    if (user.role === "admin" || (user.role === "authority" && user.authorityLevel === "central")) {
      socket.join("central-authority");
    } else if (user.role === "authority") {
      if (user.authorityLevel === "state_admin" && user.state) {
        socket.join(`state:${user.state}`);
      } else if (user.authorityLevel === "district_admin") {
        if (user.district) {
          socket.join(`district:${user.district}`);
        }
        if (user.state) {
          socket.join(`state:${user.state}`);
        }
      } else if (user.authorityLevel === "field_responder") {
        // Field responders only receive user-level and team-level dispatches
        // Automatically join team rooms that the responder is a member or leader of
        try {
          const userTeams = await ResponseTeam.find({
            $or: [{ members: user._id }, { leader: user._id }],
          }).select("_id");
          userTeams.forEach((t) => {
            socket.join(`team:${t._id}`);
          });
        } catch (err) {
          console.error("Error auto-joining responder team rooms:", err.message);
        }
      } else if (user.authorityLevel === "department") {
        if (user.district) socket.join(`district:${user.district}`);
        if (user.state) socket.join(`state:${user.state}`);
      }
    }

    // 3. Handle explicit team join with authorization check
    socket.on("join-team", async (teamId) => {
      if (!teamId) return;
      try {
        if (user.role === "admin" || user.authorityLevel === "central" || user.authorityLevel === "state_admin" || user.authorityLevel === "district_admin") {
          socket.join(`team:${teamId}`);
          return;
        }
        const team = await ResponseTeam.findById(teamId);
        if (team) {
          const isMember = team.members.some((m) => m.toString() === user._id.toString());
          const isLeader = team.leader && team.leader.toString() === user._id.toString();
          if (isMember || isLeader) {
            socket.join(`team:${teamId}`);
            console.log(`User ${user._id} joined authorized team:${teamId}`);
          }
        }
      } catch (err) {
        console.error("Error on join-team:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.name} (${user._id})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

function emitToJurisdiction(state, district, event, data) {
  if (!io) return;

  if (district) {
    io.to(`district:${district}`).emit(event, data);
  }
  if (state) {
    io.to(`state:${state}`).emit(event, data);
  }
  io.to("central-authority").emit(event, data);
}

module.exports = { setupSocketIO, getIO, emitToJurisdiction };
