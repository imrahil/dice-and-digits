import { Leaderboard } from './Leaderboard'
import { Tables } from './Tables'
import type { Session } from '../../types'

export function Watch({ session }: { session: Session }) {
  return (
    <>
      <Leaderboard session={session} />
      <Tables session={session} />
    </>
  )
}
