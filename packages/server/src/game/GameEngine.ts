import type { Room, Player } from '@chitram/shared';
import type { GameServer } from '../socket/index';
import type { WordItem } from './WordBank';

export class GameEngine {
  private timer: NodeJS.Timeout | null = null;
  private roundEndTimer: NodeJS.Timeout | null = null;
  private drawerIndex = 0;
  private currentWordItem: WordItem | null = null;

  constructor(
    private room: Room,
    private io: GameServer,
    private wordBank: WordItem[],
  ) {}

  startNextRound() {
    this.stopRoundEndTimer();
    this.room.currentRound += 1;

    if (this.room.currentRound > this.room.settings.totalRounds) {
      this.endGame();
      return;
    }

    // Only non-host players draw (TV/host is excluded from drawing rotation)
    const drawablePlayers = this.room.players.filter(p => !p.isHost);
    if (drawablePlayers.length === 0) { this.endGame(); return; }

    this.drawerIndex = this.drawerIndex % drawablePlayers.length;
    this.room.players.forEach(p => { p.isDrawing = false; });
    const drawer = drawablePlayers[this.drawerIndex];
    drawer.isDrawing = true;
    this.drawerIndex++;
    this.room.currentDrawerId = drawer.id;

    // Pick a random word
    const word = this.wordBank[Math.floor(Math.random() * this.wordBank.length)];
    this.currentWordItem = word;
    this.room.currentWord = word.malayalam;
    this.room.currentCategory = word.category;

    // Broadcast updated public room state
    this.io.to(this.room.code).emit('game:started', this.publicState());

    // Send secret word ONLY to the drawer
    this.io.to(drawer.id).emit('game:word', {
      word: word.malayalam,
      manglish: word.manglish,
      category: word.category,
    });

    // Start countdown timer
    this.startTimer();
  }

  private startTimer() {
    this.stopTimer();
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

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private stopRoundEndTimer() {
    if (this.roundEndTimer) {
      clearTimeout(this.roundEndTimer);
      this.roundEndTimer = null;
    }
  }

  handlePlayerReconnect(oldSocketId: string, newSocketId: string, player: Player) {
    if (this.room.currentDrawerId === oldSocketId) {
      this.room.currentDrawerId = newSocketId;
      player.isDrawing = true;

      if (this.currentWordItem && this.room.phase === 'playing') {
        this.io.to(newSocketId).emit('game:word', {
          word: this.currentWordItem.malayalam,
          manglish: this.currentWordItem.manglish,
          category: this.currentWordItem.category,
        });
      }
    }
  }

  endRound() {
    if (this.room.phase === 'round-end' || this.room.phase === 'game-end') return;

    this.stopTimer();
    this.stopRoundEndTimer();

    this.room.phase = 'round-end';
    this.io.to(this.room.code).emit('round:end', {
      word: this.room.currentWord ?? '',
      scores: [...this.room.players],
    });

    // Auto-advance to next round after 4 seconds
    this.roundEndTimer = setTimeout(() => {
      if (this.room.phase === 'round-end') {
        this.room.phase = 'playing';
        this.startNextRound();
      }
    }, 4000);
  }

  private endGame() {
    this.stopTimer();
    this.stopRoundEndTimer();
    this.room.phase = 'game-end';
    const leaderboard = [...this.room.players].sort((a, b) => b.score - a.score);
    this.io.to(this.room.code).emit('game:end', { leaderboard });
  }

  stop() {
    this.stopTimer();
    this.stopRoundEndTimer();
  }

  private publicState() {
    const { currentWord, ...pub } = this.room;
    return pub;
  }
}
