import { Scene } from 'phaser'

export interface ScoreData {
  id: string
  name: string
  score: number
}

export class ScoreboardManager {
  private scene: Scene
  private container: Phaser.GameObjects.Container
  private textObjects: Phaser.GameObjects.Text[] = []
  private background: Phaser.GameObjects.Rectangle
  private localPlayerId: string

  constructor(scene: Scene, localPlayerId: string) {
    this.scene = scene
    this.localPlayerId = localPlayerId

    // 1. Captura as Safe Areas do navegador (ou usa 0 como fallback)
    // Se você seguiu o passo anterior de salvar no root, lemos daqui:
    const style = window.getComputedStyle(document.documentElement)
    const safeLeft = parseInt(style.getPropertyValue('--fixed-safe-area-left')) || 0
    const safeTop = parseInt(style.getPropertyValue('--fixed-safe-area-top')) || 0

    // 2. Posiciona o container somando a margem de segurança (10px + notch)
    const startX = 10 + safeLeft
    const startY = 10 + safeTop

    this.container = this.scene.add.container(startX, startY)
    this.container.setScrollFactor(0)
    this.container.setDepth(2000)

    // 3. Fundo estilizado (Preto com borda branca simulada)
    this.background = this.scene.add
      .rectangle(0, 0, 180, 50, 0x000000, 0.8)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff) // Borda branca fina

    this.container.add(this.background)

    // 4. Título padronizado (Branco, sem amarelo)
    const title = this.scene.add.text(10, 10, 'SCOREBOARD', {
      fontFamily: 'VT323', // Usando a mesma fonte do Menu
      fontSize: '20px',
      color: '#ffffff',
    })
    this.container.add(title)
  }

  public updateScoreboard(playersData: ScoreData[]) {
    this.textObjects.forEach((text) => text.destroy())
    this.textObjects = []

    const sortedPlayers = [...playersData].sort((a, b) => b.score - a.score)

    let currentY = 40

    sortedPlayers.forEach((player, index) => {
      const isMe = player.id === this.localPlayerId

      // Tudo branco, mas com um traço para o local player (ou negrito)
      const textString = `${index + 1}. ${isMe ? '> ' : ''}${player.name}: ${player.score}`

      const textObj = this.scene.add.text(10, currentY, textString, {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#ffffff',
      })

      if (isMe) textObj.setStyle({ fontStyle: 'bold' })

      this.container.add(textObj)
      this.textObjects.push(textObj)

      currentY += 22
    })

    this.background.setSize(180, currentY + 10)
  }
}
