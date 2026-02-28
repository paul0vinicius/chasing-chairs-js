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
  players[socket.id] = { id: socket.id, x: 1, y: 1 };
  
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('move', (direction: string) => {
    socket.broadcast.emit('playerMoved', { id: socket.id, direction });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(3001, () => console.log('TS Backend running on port 3001'));