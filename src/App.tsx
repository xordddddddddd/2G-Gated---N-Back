import { CountdownScreen } from './components/CountdownScreen'
import { GameScreen } from './components/GameScreen'
import { MenuScreen } from './components/MenuScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { useGame } from './hooks/useGame'

export default function App() {
  const game = useGame()

  if (game.phase === 'menu') {
    return (
      <MenuScreen
        settings={game.settings}
        onStart={game.startSession}
        onUpdateSettings={game.updateSettings}
      />
    )
  }

  if (game.phase === 'countdown') {
    return <CountdownScreen count={game.countdown} nLevel={game.nLevel} />
  }

  if (game.phase === 'paused') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6 p-6">
        <h2 className="text-2xl font-bold">Paused</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={game.resumeSession}
            className="px-6 py-3 rounded-xl bg-accent text-white font-semibold"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={game.resetToMenu}
            className="px-6 py-3 rounded-xl border border-border text-muted hover:text-text"
          >
            Quit
          </button>
        </div>
      </div>
    )
  }

  if (game.phase === 'results' && game.stats) {
    return (
      <ResultsScreen
        stats={game.stats}
        nLevel={game.nLevel}
        suggestedN={game.suggestedN}
        adaptive={game.settings.adaptive}
        onPlayAgain={() => {
          if (game.settings.adaptive && game.suggestedN !== game.settings.nLevel) {
            game.updateSettings({ nLevel: game.suggestedN })
          }
          game.startSession()
        }}
        onMenu={game.resetToMenu}
      />
    )
  }

  if (game.phase === 'playing' && game.currentTrial) {
    return (
      <GameScreen
        trial={game.currentTrial}
        trialIndex={game.trialIndex}
        totalTrials={game.totalTrials}
        nLevel={game.nLevel}
        isScorable={game.isScorable}
        feedback={game.feedback}
        onMatch={game.handleMatch}
        onPause={game.pauseSession}
      />
    )
  }

  return null
}
