import * as core from '@actions/core'
import { parse_yaml } from './utils'
import { AuthMapSchema, ImageSyncMapSchema } from './skopeo/types'
import { login } from './skopeo/auth'
import { copy, pair } from './skopeo/image'
import { print_skopeo_version } from './skopeo/version'

export async function run(): Promise<void> {
  try {
    const auth_file = core.getInput('auth_file')
    const images_file = core.getInput('images_file')
    const skip_error = core.getBooleanInput('skip_error')

    await print_skopeo_version()

    const auths = parse_yaml(auth_file, AuthMapSchema)
    for (const registry in auths) {
      const login_status = await login(registry, auths[registry])
      core.info(`Login ${registry} ${login_status ? 'Success' : 'Failed'}`)
    }

    const image_sync_map = parse_yaml(images_file, ImageSyncMapSchema)
    for (const source_img in image_sync_map) {
      const syncs = await pair(source_img, image_sync_map[source_img] as never)
      await copy(syncs, skip_error)
    }
  } catch (e) {
    core.setFailed(e as Error)
  }
}
