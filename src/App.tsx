import { QuadLayout } from './components/QuadLayout'
import { useGame } from './hooks/useGame'

export default function App() {
  const game = useGame()
  return <QuadLayout {...game} />
}
