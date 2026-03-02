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

    // Cria um container ancorado no canto superior esquerdo
    this.container = this.scene.add.container(10, 10)

    // O scrollFactor(0) garante que o placar não se mova se a câmera andar
    this.container.setScrollFactor(0)
    this.container.setDepth(2000) // Fica acima de tudo no jogo

    // Cria o fundo escuro (será redimensionado dinamicamente depois)
    this.background = this.scene.add.rectangle(0, 0, 150, 50, 0x000000, 0.6).setOrigin(0)
    this.container.add(this.background)

    // Título do Placar
    const title = this.scene.add.text(10, 10, '🏆 SCOREBOARD', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f1c40f',
    })
    this.container.add(title)
  }

  // Método principal que a Scene vai chamar sempre que alguém pontuar ou entrar
  public updateScoreboard(playersData: ScoreData[]) {
    // 1. Limpa os textos antigos (exceto o título e fundo)
    this.textObjects.forEach((text) => text.destroy())
    this.textObjects = []

    // 2. Ordena os jogadores do maior para o menor placar
    const sortedPlayers = [...playersData].sort((a, b) => b.score - a.score)

    let currentY = 35 // Posição Y inicial abaixo do título

    // 3. Desenha cada jogador na lista
    sortedPlayers.forEach((player, index) => {
      const isMe = player.id === this.localPlayerId

      // Destaque visual: Amarelo para você, Branco para os outros
      const color = isMe ? '#f1c40f' : '#ffffff'
      const prefix = isMe ? '(You) ' : ''
      const textString = `${index + 1}. ${prefix}${player.name}: ${player.score}`

      const textObj = this.scene.add.text(10, currentY, textString, {
        fontSize: '14px',
        color: color,
      })

      this.container.add(textObj)
      this.textObjects.push(textObj)

      currentY += 20 // Desce 20px para a próxima linha
    })

    // 4. Ajusta o tamanho do fundo dinamicamente para caber todo mundo
    this.background.setSize(180, currentY + 10)
  }
}
