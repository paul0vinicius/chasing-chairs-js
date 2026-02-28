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

let chairActive = false;
let chairPosition = { x: -1, y: -1 };
const mapWidth = 8;
const mapHeight = 5;
const walls = [
  {x: 2, y: 2}, {x: 3, y: 2}, {x: 5, y: 2}, {x: 5, y: 3} // Match your MainScene mapData 1s
];

async function getRandomMusic() {
  const queries = ['brazilian funk'];
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${query}`);
    const data = await response.json();
    const tracks = data.data;
    // Pick a random track from the first 25 results
    const randomTrack = tracks[Math.floor(Math.random() * Math.min(tracks.length, 25))];
    return randomTrack.preview; // This is the 30s MP3 URL
  } catch (error) {
    console.error("Music fetch failed:", error);
    return null;
  }
}

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
    socket.on('requestReset', () => {
        console.log(`Reset requested by ${socket.id}`);
        
        // 1. Clear current game state
        chairActive = false;
        chairPosition = { x: -1, y: -1 };
        
        // 2. Tell everyone to clean up their screens
        io.emit('chairTaken', { winnerId: 'RESET' }); 
        
        // 3. Trigger the music and spawn logic immediately
        startRound();
    });

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

  // Inside your io.on('connection') block:
  socket.on('playerSat', () => {
    if (chairActive) {
      console.log(`Player ${socket.id} won the round!`);
      
      // 1. End current round
      chairActive = false;
      chairPosition = { x: -1, y: -1 };

      // 2. Tell everyone the chair is GONE (so they hide the sprite)
      io.emit('chairTaken', { winnerId: socket.id });

      // 3. START THE NEXT ROUND AUTOMATICALLY
      startRound();
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

async function startRound() {
  if (chairActive) return; // Prevent multiple chairs spawning at once

  const musicUrl = await getRandomMusic();
  io.emit('startMusic', { url: musicUrl });

  // Random delay between 2 and 5 seconds
  const delay = Math.floor(Math.random() * 3000) + 10_000;

  setTimeout(() => {
    // 1. Calculate random position (avoiding walls)
    let rx: number = -1, ry: number = -1
    let isWall = true;
    while (isWall) {
      rx = Math.floor(Math.random() * (mapWidth - 2)) + 1;
      ry = Math.floor(Math.random() * (mapHeight - 2)) + 1;
      isWall = walls.some(w => w.x === rx && w.y === ry);
    }

    chairPosition = { x: rx, y: ry };
    chairActive = true;

    // 2. Tell everyone to STOP music and SPAWN chair
    io.emit('chairSpawned', chairPosition);
    console.log(`Chair spawned at ${rx}, ${ry}`);
  }, delay);
}

// Start the first cycle when the server starts or when someone joins
startRound();

server.listen(3001, () => console.log('TS Backend running on port 3001'));