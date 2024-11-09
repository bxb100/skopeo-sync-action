import { exec } from '@actions/exec'

export async function print_skopeo_version(): Promise<void> {
  await exec('skopeo', ['--version'])
}
