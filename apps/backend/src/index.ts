import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import customParser from 'socket.io-msgpack-parser'

import { ServerToClientEvents, ClientToServerEvents } from '@chasing-chairs/shared'
import { RoomManager } from './room/RoomManager'
import { SocketHandler } from './socket-handler/SocketHandler'

const app = express()
app.use(cors())
const server = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' },
  parser: customParser,
})

const roomManager = new RoomManager()
const socketHandler = new SocketHandler(io, roomManager)

// Single connection listener
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  socketHandler.handleConnection(socket)
})

server.listen(3001, () => console.log('TS Backend running on port 3001'))
