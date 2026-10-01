// A minimal D1 binding over node:sqlite, so the tests run the real SQL from
// migrations/ instead of a hand-written mock.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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
