import { Home } from '../../screens/Home'
import { NewGame } from '../../screens/NewGame'
import { Play } from '../../screens/Play'
import { Result } from '../../screens/Result'
import { History } from '../../screens/History'
import { Stats } from '../../screens/Stats'
import { Tools } from '../../screens/Tools'
import { More } from '../../screens/More'
import { Players } from '../../screens/Players'
import { Games } from '../../screens/Games'
import { MyGames } from '../../screens/MyGames'
import { Advanced } from '../../screens/Advanced'
import { Help } from '../../screens/Help'
import { GameEditor } from '../../screens/GameEditor'
import { Live } from '../../screens/Live'
import { Join } from '../../screens/Join'
import { Restore } from '../../screens/Restore'

export function Router({ route }: { route: string[] }) {
  const [head = '', a] = route

  switch (head) {
    case '':
      return <Home />
    case 'new':
      return <NewGame gameId={a} />
    case 'play':
      return <Play id={a} />
    case 'result':
      return <Result id={a} />
    case 'history':
      return <History />
    case 'stats':
      return <Stats />
    case 'tools':
      return <Tools tab={a} />
    case 'more':
      return <More />
    case 'players':
      return <Players />
    case 'games':
      return a ? <GameEditor id={a} /> : <Games />
    case 'my-games':
      return <MyGames />
    case 'advanced':
      return <Advanced />
    case 'help':
      return <Help />
    case 'live':
      return <Live code={a} />
    case 'join':
      return <Join link={route.slice(1).join('/')} />
    case 'restore':
      return <Restore />
    default:
      return <Home />
  }
}
