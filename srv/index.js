import { log } from "console";
import { Server } from "socket.io";

const wss = new Server(5000, {
  cors: { origin: "*" },
});

wss.on("connection", async (ws) => {
  log("con:", ws.id);

  ws.broadcast.emit("peer", ws.id);
  ws.emit(
    "nodes",
    (await wss.sockets.fetchSockets()).reduce(
      (a, { id, init }) =>
        init ? [...a, { id, init: !!init }] : a,
      []
    )
  );

  ws.on("signal", (id, s) => {
    ws.to(id).emit("signal", ws.id, s);
  });

  ws.on("up", () => {
    ws.init = true;
    ws.broadcast.emit("up", ws.id);
  });

  ws.on("down", () => {
    ws.init = false;
    ws.broadcast.emit("down", ws.id);
  });

  ws.on("disconnect", () => {
    log("dis:", ws.id);
  });
});
