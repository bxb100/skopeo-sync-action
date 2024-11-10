import * as fs from 'node:fs'
import { ZodType } from 'zod'
import { parseDocument } from 'yaml'
import * as process from 'node:process'

export function parse_yaml<T>(file_path: string, schema: ZodType<T>): T {
  const file = fs.readFileSync(file_path, 'utf8')
  const doc = parseDocument(file)
  return schema.parse(doc.toJS())
}

/**
 * Simply inject env to template string, support `${ENV_NAME}`, `$ENV_NAME`
 *
 * @param template string
 */
export function inject_env(template: string): string {
  const envs = process.env
  const env_map = new Map<string, string | undefined>()
  for (const k in envs) {
    env_map.set(k.toLowerCase(), envs[k])
  }

  const tokens = lexer(template)
  const replace_map = new Map<string, string>()
  tokens.forEach(token => {
    const v = env_map.get(token.k.toLowerCase())
    if (v) {
      replace_map.set(template.substring(token.start, token.end + 1), v)
    }
  })
  let res = template
  for (const [k, v] of replace_map) {
    res = res.replace(k, v)
  }
  return res
}

export type Token = {
  start: number
  end: number
  pre_len: number
  k: string
}

export function lexer(str: string, strict = false): Token[] {
  const res: Token[] = []
  const keyword = '$'
  const bracket_pre = ['[', '(', '{']
  const bracket_pos = [']', ')', '}']
  const chars = Array.from(str)

  let c
  for (let i = 0; i < chars.length; i++) {
    c = chars[i]
    if (c === keyword) {
      i++
      let around_len = 0
      let pre: string | undefined
      let pos: string | undefined
      for (let j = i; j < i + 2; j++) {
        if (bracket_pre.includes(chars[j])) {
          if (strict && pre === undefined) {
            pre = chars[j]
            pos = bracket_pos[bracket_pre.indexOf(pre)]
          } else if (strict && pre) {
            if (chars[j] != pre) {
              throw new Error(`Invalid bracket, pre: ${pre}, cur: ${chars[j]}`)
            }
          }
          around_len++
        } else break
      }
      const start = i + around_len
      let j = start
      while (chars.length > j && /[a-zA-Z0-9_-]/.test(chars[j])) {
        j++
      }
      if (j === start) {
        // no valid alphanumeric ident
        continue
      }
      for (let k = j; k < j + around_len; k++) {
        if (k >= chars.length || !bracket_pos.includes(chars[k])) {
          throw new Error('Not valid sentence')
        }
        if (strict && pos && pos !== chars[k]) {
          throw new Error(
            `Invalid correspond bracket, except: ${pos}, cur: ${chars[k]}`
          )
        }
      }
      res.push({
        start: start - around_len - 1,
        end: j + around_len - 1,
        pre_len: around_len,
        k: str.substring(start, j)
      })
      // skip
      i = j - 1
    }
  }

  return res
}
