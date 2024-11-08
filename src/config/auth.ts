import { z } from 'zod'
import { exec } from '@actions/exec'
import { AuthSchema } from './types'
import { inject_env } from '../utils'
import * as core from '@actions/core'

export async function login(
  registry: string,
  auth: z.infer<typeof AuthSchema>
): Promise<boolean> {
  const username = inject_env(auth.username)
  const password = inject_env(auth.password)

  core.setSecret(username)
  core.setSecret(password)

  // https://github.com/containers/skopeo/blob/main/docs/skopeo-login.1.md
  const exist_code = await exec('skopeo', [
    'login',
    '-u',
    username,
    '-p',
    password,
    registry
  ])

  return exist_code === 0
}
