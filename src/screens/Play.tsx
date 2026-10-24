import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { Empty, Page } from '../components/ui'
import { Board } from '../components/play/Board'

export function Play({ id }: { id: string }) {
  const session = useStore((s) => s.sessions[id])
  const done = Boolean(session?.finishedAt)

  useEffect(() => {
    if (done) {
      navigate(`result/${id}`, { replace: true })
    }
  }, [done, id])

  if (!session || session.deleted) {
    return (
      <Page back="">
        <Empty icon="🤷" title="404" />
      </Page>
    )
  }

  if (done) {
    return null
  }

  return <Board key={id} session={session} />
}
