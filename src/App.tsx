import { QuadLayout } from './components/QuadLayout'
import { TutorialLayout } from './components/TutorialLayout'
import { useGame } from './hooks/useGame'
import { useTutorial } from './hooks/useTutorial'

export default function App() {
  const game = useGame()
  const tutorial = useTutorial(game.settings)

  if (game.phase === 'tutorial') {
    return (
      <TutorialLayout
        game={game}
        tutorial={tutorial}
        onExit={game.exitTutorial}
        onStartTraining={game.startSession}
      />
    )
  }

  return <QuadLayout {...game} />
}
