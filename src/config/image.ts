import { ImageSyncInfo, SkopeoListTagsResSchema, Sync, SyncType } from './types'
import { exec } from '@actions/exec'
import { z } from 'zod'
import * as core from '@actions/core'

export function sync_type(source_image: string): ImageSyncInfo {
  if (source_image.includes('@')) {
    const [image, digest] = source_image.split('@')
    return {
      type: SyncType.Digest,
      image,
      tag: [digest]
    }
  }
  const [image, tag] = source_image.split(':')
  if (tag) {
    if (tag.startsWith('/') && tag.endsWith('/')) {
      return {
        type: SyncType.Regex,
        image,
        regex: new RegExp(tag)
      }
    }
    return {
      type: SyncType.Tag,
      image,
      tag: tag.split(',')
    }
  }
  return {
    type: SyncType.All,
    image
  }
}

export async function copy(
  source_image: string,
  dest_image: string[],
  skip_error: boolean
): Promise<void> {
  const source_images = await gen_need_sync_source_images(source_image)
  if (source_images === undefined) {
    throw new Error(`${source_image} not found`)
  }
  const syncs: Sync[] = gen_ready_to_sync_image_pair(source_images, dest_image)
  // https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
  core.summary.addHeading('Sync Summary:', 2)
  for (let i = 0; i < syncs.length; i++) {
    const sync = syncs[i]
    let err = ''
    let out = ''
    const exit_code = await exec(
      'skopeo',
      // --multi-arch not support under 1.8.0
      // https://github.com/containers/skopeo/commit/4ef35a385af074c979c9f8c4e2e37c38b0963c3a
      ['copy', '--all', sync.source_image, sync.dest_image],
      {
        listeners: {
          errline: (data: string) => {
            err += data + '\n'
          },
          stdline: (data: string) => {
            out += data + '\n'
          }
        }
      }
    )
    core.summary.addRaw(
      `process [${i + 1}/${syncs.length}]: sync ${sync.source_image} to ${sync.dest_image}`,
      true
    )
    if (err) {
      core.summary.addDetails(':x:', err)
    } else if (out) {
      core.summary.addDetails(':white_check_mark:', out)
    }
    await core.summary.write()
    if (!skip_error && exit_code != 0) {
      throw new Error(
        `sync ${sync.source_image} to ${sync.dest_image} failed: ${err}`
      )
    }
  }
}

export async function list_tag(
  source_image: ImageSyncInfo
): Promise<z.infer<typeof SkopeoListTagsResSchema>> {
  // https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
  let res = ''
  let err = ''
  const exit_code = await exec(
    'skopeo',
    ['list-tags', `docker://${source_image.image}`],
    {
      listeners: {
        stdout: (data: Buffer) => {
          res += data.toString()
        },
        stderr: (data: Buffer) => {
          err += data.toString()
        }
      }
    }
  )

  if (exit_code != 0) {
    throw new Error(`skopeo list-tags: ${err}`)
  }

  return SkopeoListTagsResSchema.parse(res)
}

export async function gen_need_sync_source_images(
  source_image: string
): Promise<string[] | undefined> {
  const sync_info = sync_type(source_image)
  switch (sync_info.type) {
    case SyncType.Tag:
    case SyncType.Digest:
      return sync_info.tag?.map(t => `docker://${sync_info.image}:${t}`)
  }
  const tag = await list_tag(sync_info)
  if (sync_info.type === SyncType.All) {
    return tag.Tags.map(t => `docker://${sync_info.image}:${t}`)
  }
  return tag.Tags.filter(t => sync_info.regex?.test(t)).map(
    t => `docker://${sync_info.image}:${t}`
  )
}

export function gen_ready_to_sync_image_pair(
  source_images: string[],
  raw_dest_images: string[]
): Sync[] {
  return source_images.reduce((acc, cur) => {
    const data = raw_dest_images.map(d => ({
      source_image: cur,
      dest_image: `docker://${d}`
    }))
    return [...acc, ...data]
  }, [] as Sync[])
}
