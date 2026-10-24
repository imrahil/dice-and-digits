// A minimal D1 binding over node:sqlite, so the tests run the real SQL from
// migrations/ instead of a hand-written mock.
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Through require, not a static import: in browser-like test environments
// (src/lib/cloud.test.ts runs under happy-dom) Vitest 5 only leaves the
// built-ins in `builtinModules` unbundled, and prefix-only ones like
// node:sqlite aren't in that list, so Vite would try to bundle it.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

class Stmt {
  constructor(db, sql, args = []) {
    this.db = db
    this.sql = sql
    this.args = args
  }

  bind(...args) {
    return new Stmt(this.db, this.sql, args)
  }

  first() {
    return Promise.resolve(this.db.prepare(this.sql).get(...this.args) ?? null)
  }

  all() {
    return Promise.resolve({ results: this.db.prepare(this.sql).all(...this.args) })
  }

  run() {
    const r = this.db.prepare(this.sql).run(...this.args)

    return Promise.resolve({ meta: { changes: Number(r.changes) } })
  }
}

export function createD1() {
  const db = new DatabaseSync(':memory:')
  // A path rather than a URL object: this helper also runs under Vitest's
  // happy-dom, whose URL class node:fs does not accept.
  const dir = join(fileURLToPath(import.meta.url), '../../migrations')

  for (const f of readdirSync(dir).sort()) {
    db.exec(readFileSync(join(dir, f), 'utf8'))
  }

  return {
    raw: db,
    prepare: (sql) => new Stmt(db, sql),
    async batch(stmts) {
      db.exec('BEGIN')

      try {
        const out = []

        for (const s of stmts) {
          out.push(await s.run())
        }

        db.exec('COMMIT')

        return out
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}
