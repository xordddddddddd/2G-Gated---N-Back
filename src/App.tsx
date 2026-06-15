import { GameScreen } from './components/GameScreen'
import { MenuScreen } from './components/MenuScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { TutorialScreen } from './components/TutorialScreen'
import { useGame } from './hooks/useGame'
import { useTutorial } from './hooks/useTutorial'
import { resetSettings } from './lib/settings'

export default function App() {
  const game = useGame()
  const tutorial = useTutorial(game.settings.soundEnabled)

  if (game.phase === 'menu') {
    return (
      <MenuScreen
        settings={game.settings}
        onStart={game.startSession}
        onStartTutorial={() => {
          tutorial.resetTutorial()
          game.startTutorial()
        }}
        onUpdateSettings={game.updateSettings}
        onResetSettings={() => game.updateSettings(resetSettings())}
      />
    )
  }

  if (game.phase === 'tutorial') {
    return (
      <TutorialScreen
        {...tutorial}
        onExit={game.resetToMenu}
        onStartTraining={game.startSession}
      />
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
        trialsRemaining={game.trialsRemaining}
        nLevel={game.nLevel}
        isScorable={game.isScorable}
        feedback={game.feedback}
        settings={game.settings}
        pressedStreams={game.pressedStreams}
        onStreamPress={game.handleStreamPress}
        onStop={game.stopSession}
      />
    )
  }

  return null
}
