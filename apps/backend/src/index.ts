import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

interface PlayerData {
  id: string;
  x: number;
  y: number;
}

const players: Record<string, PlayerData> = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Create the new player state
    players[socket.id] = {
        id: socket.id,
        x: 1,
        y: 1,
        // Add any other state like 'isSitting' here later
    };
  
  // 2. THE KEY STEP: Send the existing player list ONLY to the new player
    // This gives the joining player "awareness" of who was already there.
    socket.emit('currentPlayers', players);

    // 3. Then, tell everyone ELSE that a new player joined
    socket.broadcast.emit('newPlayer', players[socket.id]);

  // Inside your io.on('connection') block
  socket.on('move', (direction) => {
    const player = players[socket.id];
    if (!player) return;

    // Update the server's memory of where this player is
    if (direction === 'left') player.x -= 1;
    else if (direction === 'right') player.x += 1;
    else if (direction === 'up') player.y -= 1;
    else if (direction === 'down') player.y += 1;

    // Now when 'currentPlayers' is sent to a NEW user, 
    // these new x and y values are included.
    socket.broadcast.emit('playerMoved', { id: socket.id, direction });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(3001, () => console.log('TS Backend running on port 3001'));