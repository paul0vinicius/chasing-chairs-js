import { Scene } from 'phaser';
import { io, Socket } from 'socket.io-client';
import { GridEngine, Direction } from 'grid-engine';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export class MainScene extends Scene {
  private gridEngine!: GridEngine;
  private socket!: Socket;
  private remotePlayers: { [key: string]: Phaser.GameObjects.Sprite } = {};
  private currentChairSprite: Phaser.GameObjects.Sprite | null = null;
  private currentChairPos = { x: -1, y: -1 };
  private currentMusic: HTMLAudioElement | null = null;

  constructor() {
    super('MainScene');
  }

  private createResetButton() {
    // Positioning at the bottom right
    const btn = this.add.text(780, 580, 'RESET ROUND', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#34495e',
      padding: { x: 10, y: 5 }
    })
      .setOrigin(1)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    // Hover effects
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#2c3e50' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#34495e' }));

    // On Click
    btn.on('pointerdown', () => {
      this.socket.emit('requestReset');
      btn.setStyle({ backgroundColor: '#16a085' }); // Visual click feedback
    });
  }

  private showBanner(text: string) {
    const banner = this.add.text(400, 100, text, {
      fontSize: '48px',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Fade out and destroy after 2 seconds
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => banner.destroy()
    });
  }

  private createMobileControls() {
    const { height } = this.scale;
    const size = 60;
    const padding = 20;

    // Position the D-pad in the bottom left
    const centerX = size * 1.5 + padding;
    const centerY = height - (size * 1.5 + padding);

    const buttons = [
      { dir: Direction.UP, x: centerX, y: centerY - size },
      { dir: Direction.DOWN, x: centerX, y: centerY + size },
      { dir: Direction.LEFT, x: centerX - size, y: centerY },
      { dir: Direction.RIGHT, x: centerX + size, y: centerY }
    ];

    buttons.forEach(btnConfig => {
      const btn = this.add.rectangle(btnConfig.x, btnConfig.y, size - 5, size - 5, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(1000);

      // Add a small arrow text
      const arrows: any = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };
      this.add.text(btnConfig.x, btnConfig.y, arrows[btnConfig.dir], { fontSize: '32px' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(1001);

      // Movement Logic
      btn.on('pointerdown', () => {
        btn.setFillStyle(0xffffff, 0.5);
        this.sendMove(btnConfig.dir);
      });

      btn.on('pointerup', () => btn.setFillStyle(0xffffff, 0.2));
      btn.on('pointerout', () => btn.setFillStyle(0xffffff, 0.2));
    });
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

    this.load.audio('alert', 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }

  create() {
    // 1. Setup Grid and Map FIRST
    const mapData = [[1, 1, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 0, 1, 0, 1], [1, 0, 0, 0, 0, 1, 0, 1], [1, 1, 1, 1, 1, 1, 1, 1]];
    const map = this.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage('tileTexture', 'tileTexture');
    if (tileset) map.createLayer(0, tileset, 0, 0);

    const playerSprite = this.add.sprite(0, 0, 'playerTexture').setOrigin(0);
    this.gridEngine.create(map, {
      characters: [{ id: 'player1', sprite: playerSprite, startPosition: { x: 1, y: 1 } }],
    });

    this.input.once('pointerdown', () => {
      // 1. Play current music if it was waiting
      if (this.currentMusic && this.currentMusic.paused) {
        this.currentMusic.play().catch(() => { });
      }

      // 2. Safely resume the Phaser Audio Context
      const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (soundManager.context && soundManager.context.state === 'suspended') {
        soundManager.context.resume();
      }
    });

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;

      // Re-center your camera
      this.cameras.main.centerOn(width, height); // Center on your map (approx 8x32 / 5x32)
    });

    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      // Use 'this.currentChairPos' instead of the undefined 'chairPosition'
      if (charId === 'player1' && this.currentChairPos.x !== -1) {
        const pos = this.gridEngine.getPosition('player1');

        if (pos.x === this.currentChairPos.x && pos.y === this.currentChairPos.y) {
          this.socket.emit('playerSat', { id: this.socket.id });
          (this.gridEngine.getSprite('player1') as any).setTint(0xffff00);
          console.log("I GOT THE CHAIR!");

          // Optional: Reset chair pos so you can't "sit" on it twice
          this.currentChairPos = { x: -1, y: -1 };
        }
      }
    });

    // 2. ONLY NOW connect to the socket
    // This ensures all systems are hot before a single byte comes from the network
    this.socket = io(socketUrl, {
      reconnection: false // Prevent ghost reconnections during dev
    });

    this.events.once('create', () => {
      this.socket = io(socketUrl);
      this.setupSocketListeners();
      this.createResetButton();
      this.createMobileControls();
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
        // Don't add yourself as a "remote" player!
        if (p.id !== this.socket.id) {
          this.addRemotePlayer(p);
        }
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

    this.socket.on('chairSpawned', (pos: { x: number, y: number }) => {
      // 1. STOP THE MUSIC IMMEDIATELY
      if (this.currentMusic) {
        this.currentMusic.pause();
        this.currentMusic = null;
      }

      // 2. PLAY THE ALERT SOUND
      this.sound.play('alert');

      // 3. SHOW THE BANNER
      this.showBanner("CHAIR APPEARED! RUN!");

      // 1. Update the class state so 'movementStopped' can see it
      this.currentChairPos = pos;

      // 2. Visuals: Remove old chair if it exists
      if (this.currentChairSprite) this.currentChairSprite.destroy();

      // 3. Create and position the new chair
      this.currentChairSprite = this.add.sprite(pos.x * 32, pos.y * 32, 'chairTexture').setOrigin(0);

      console.log("A chair appeared!");
    });

    this.socket.on('chairTaken', (data: { winnerId: string }) => {
      if (data.winnerId === 'RESET') {
        this.showBanner("ROUND RESETTING...");
      } else {
        const msg = data.winnerId === this.socket.id ? "YOU WON THE CHAIR!" : "TOO SLOW!";
        console.log(`Round ended! Winner: ${data.winnerId}`);
        this.showBanner(msg);
      }

      // 1. Remove the chair sprite from the screen
      if (this.currentChairSprite) {
        this.currentChairSprite.destroy();
        this.currentChairSprite = null;
      }

      // 2. Reset the local coordinate check
      this.currentChairPos = { x: -1, y: -1 };

      // 3. Visual feedback: if I didn't win, clear my tint (or vice versa)
      if (data.winnerId !== this.socket.id) {
        (this.gridEngine.getSprite('player1') as any).clearTint();
      }
    });

    this.socket.on('startMusic', (data: { url: string }) => {
      if (this.currentMusic) this.currentMusic.pause();
      this.currentMusic = new Audio(data.url);
      this.currentMusic.play().catch(() => console.log("Audio play blocked by browser"));
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