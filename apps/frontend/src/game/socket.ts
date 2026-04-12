import { io, Socket } from 'socket.io-client'
import customParser from 'socket.io-msgpack-parser'

import { ClientToServerEvents, ServerToClientEvents } from '@chasing-chairs/shared'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
  parser: customParser,
  transports: ['websocket'],
})
