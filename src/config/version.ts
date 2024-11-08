import { exec } from '@actions/exec'
import * as core from '@actions/core'

export async function print_skopeo_version(): Promise<void> {
  await exec('skopeo', ['--version'], {
    silent: true,
    listeners: {
      stdline: data => {
        core.info(data)
      }
    }
  })
}
