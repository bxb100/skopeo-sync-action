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

  return template
    .replaceAll(/\${(.+?)}/g, (ori, variable: string) => {
      return env_map.get(variable.toLowerCase()) || ori
    })
    .replaceAll(/\$(\w+)/g, (ori, variable: string) => {
      return env_map.get(variable.toLowerCase()) || ori
    })
}
