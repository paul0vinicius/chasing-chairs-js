import { Scene } from 'phaser';
import { io, Socket } from 'socket.io-client';
import { GridEngine, Direction } from 'grid-engine';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export class MainScene extends Scene {
  private gridEngine!: GridEngine;
  private socket!: Socket;
  private remotePlayers: { [key: string]: Phaser.GameObjects.Sprite } = {};

  constructor() {
    super('MainScene');
  }

  preload() {
    // ... (Your texture generation code is fine, keep it as is)
    const tileGraphic = this.make.graphics({ x: 0, y: 0 });
    tileGraphic.lineStyle(1, 0xffffff, 0.2);
    tileGraphic.strokeRect(0, 0, 32, 32);
    tileGraphic.generateTexture('tileTexture', 32, 32);

    const playerGraphic = this.make.graphics({ x: 0, y: 0 });
    playerGraphic.fillStyle(0x00ff00, 1);
    playerGraphic.fillRect(2, 2, 28, 28);
    playerGraphic.generateTexture('playerTexture', 32, 32);

    const remoteGraphic = this.make.graphics({ x: 0, y: 0 });
    remoteGraphic.fillStyle(0xff0000, 1);
    remoteGraphic.fillRect(2, 2, 28, 28);
    remoteGraphic.generateTexture('remoteTexture', 32, 32);
  }

  create() {
    // 1. Setup Grid and Map FIRST
    const mapData = [[1, 1, 1, 1, 1, 1, 1, 1],[1, 0, 0, 0, 0, 0, 0, 1],[1, 0, 1, 1, 0, 1, 0, 1],[1, 0, 0, 0, 0, 1, 0, 1],[1, 1, 1, 1, 1, 1, 1, 1]];
    const map = this.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture');
    if (tileset) map.createLayer(0, tileset, 0, 0);

    const playerSprite = this.add.sprite(0, 0, 'playerTexture').setOrigin(0);
    this.gridEngine.create(map, {
      characters: [{ id: 'player1', sprite: playerSprite, startPosition: { x: 1, y: 1 } }],
    });

    // 2. ONLY NOW connect to the socket
    // This ensures all systems are hot before a single byte comes from the network
    this.socket = io(socketUrl, {
        reconnection: false // Prevent ghost reconnections during dev
    });

    this.events.once('create', () => {
        this.socket = io(socketUrl);
        this.setupSocketListeners();
        console.log("Scene and Factory are 100% ready. Connecting sockets...");
    });

    // Manually trigger the event if needed, or just call it after setup
    this.events.emit('create');
  }

  private setupSocketListeners() {
    // CLEANUP: Force remove any old listeners that might be lingering
    this.socket.off('currentPlayers');
    this.socket.off('newPlayer');

    this.socket.on('currentPlayers', (players: any) => {
      Object.values(players).forEach((p: any) => {
        if (p.id !== this.socket.id) this.addRemotePlayer(p);
      });
    });

    this.socket.on('newPlayer', (data: any) => {
      this.addRemotePlayer(data);
    });

    this.socket.on('playerMoved', ({ id, direction }: { id: string; direction: string }) => {
      if (this.remotePlayers[id]) {
        this.gridEngine.move(id, direction as Direction);
      }
    });

    this.socket.on('playerDisconnected', (id: string) => {
      if (this.remotePlayers[id]) {
        this.gridEngine.removeCharacter(id);
        this.remotePlayers[id].destroy();
        delete this.remotePlayers[id];
      }
    });
  }

  private addRemotePlayer(data: any) {
    // Check if the scene is actually running and NOT shutting down
    if (!this.sys || !this.sys.isActive() || !this.add) {
        return;
    }

    if (this.remotePlayers[data.id]) return;

    const sprite = this.add.sprite(0, 0, 'remoteTexture').setOrigin(0);
    this.gridEngine.addCharacter({
        id: data.id,
        sprite: sprite,
        startPosition: { x: data.x, y: data.y }
    });
    this.remotePlayers[data.id] = sprite;
    }

  update() {
    // Only process input if the socket is actually connected
    if (!this.socket || !this.socket.connected) return;

    const cursors = this.input.keyboard!.createCursorKeys();
    if (cursors.left.isDown) this.sendMove(Direction.LEFT);
    else if (cursors.right.isDown) this.sendMove(Direction.RIGHT);
    else if (cursors.up.isDown) this.sendMove(Direction.UP);
    else if (cursors.down.isDown) this.sendMove(Direction.DOWN);
  }

  private sendMove(direction: Direction) {
    if (this.gridEngine && !this.gridEngine.isMoving('player1')) {
      this.gridEngine.move('player1', direction);
      this.socket.emit('move', direction);
    }
  }
}