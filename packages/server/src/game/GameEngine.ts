import type { Room } from '@chitram/shared';
import type { GameServer } from '../socket/index';

interface Word { malayalam: string; manglish: string; }

export class GameEngine {
  private timer: NodeJS.Timeout | null = null;
  private drawerIndex = 0;

  constructor(
    private room: Room,
    private io: GameServer,
    private wordBank: Word[],
  ) {}

  startNextRound() {
    this.room.currentRound += 1;

    if (this.room.currentRound > this.room.settings.totalRounds) {
      this.endGame();
      return;
    }

    // Rotate drawer
    const players = this.room.players;
    this.drawerIndex = (this.drawerIndex) % players.length;
    players.forEach(p => { p.isDrawing = false; });
    const drawer = players[this.drawerIndex];
    drawer.isDrawing = true;
    this.drawerIndex++;
    this.room.currentDrawerId = drawer.id;

    // Pick a random word
    const word = this.wordBank[Math.floor(Math.random() * this.wordBank.length)];
    this.room.currentWord = word.malayalam;

    // Broadcast updated public room state
    this.io.to(this.room.code).emit('game:started', this.publicState());

    // Send secret word ONLY to the drawer
    this.io.to(drawer.id).emit('game:word', {
      word: word.malayalam,
      manglish: word.manglish,
    });

    // Start countdown timer
    this.startTimer();
  }

  private startTimer() {
    let remaining = this.room.settings.roundDurationSeconds;
    this.io.to(this.room.code).emit('timer:tick', { remaining });

    this.timer = setInterval(() => {
      remaining -= 1;
      this.io.to(this.room.code).emit('timer:tick', { remaining });

      if (remaining <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  endRound() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.room.phase = 'round-end';
    this.io.to(this.room.code).emit('round:end', {
      word: this.room.currentWord ?? '',
      scores: [...this.room.players],
    });

    // Auto-advance to next round after 5 seconds
    setTimeout(() => {
      this.room.phase = 'playing';
      this.startNextRound();
    }, 5000);
  }

  private endGame() {
    this.room.phase = 'game-end';
    const leaderboard = [...this.room.players].sort((a, b) => b.score - a.score);
    this.io.to(this.room.code).emit('game:end', { leaderboard });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  private publicState() {
    const { currentWord, ...pub } = this.room;
    return pub;
  }
}
