import {
  ImageSyncInfo,
  ImageSyncValSchema,
  SkopeoListTagsResSchema,
  Sync,
  SyncType
} from './types'
import { exec } from '@actions/exec'
import { z } from 'zod'
import * as core from '@actions/core'
import { satisfies } from 'semver'
import assert from 'node:assert'

/**
 * https://docs.docker.com/reference/cli/docker/image/pull/
 *
 * `NAME[:TAG|@DIGEST]`
 *
 * Addition support `NAME:/regex/`
 *
 * @param source_image eg. `nginx:latest`, `ghcr.io/advplyr/audiobookshelf:latest`
 */
export function sync_type(source_image: string): ImageSyncInfo {
  if (source_image.includes('@')) {
    const [image, digest] = source_image.split('@')
    return {
      type: SyncType.Digest,
      image,
      digest
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

export async function pair(
  k: string,
  v: z.infer<typeof ImageSyncValSchema>
): Promise<Sync[]> {
  let sync_info: ImageSyncInfo
  let dest_image: string[]
  if ('semver' in v) {
    sync_info = {
      image: k,
      type: SyncType.Semver,
      semver: v.semver
    }
    dest_image = v.dest
  } else if ('regex' in v) {
    sync_info = {
      image: k,
      type: SyncType.Regex,
      regex: new RegExp(v.regex)
    }
    dest_image = v.dest
  } else {
    sync_info = sync_type(k)
    dest_image = v
  }

  console.log(sync_info)

  const source_images = await gen_need_sync_source_images(sync_info)
  console.log(source_images)
  if (source_images === undefined) {
    throw new Error(`Image ${k} not found`)
  }
  return cartesian_source_dest_sync_pair(source_images, dest_image)
}

export async function copy(syncs: Sync[], skip_error: boolean): Promise<void> {
  core.summary.addHeading('Sync Summary:', 2)
  for (let i = 0; i < syncs.length; i++) {
    const sync = syncs[i]
    const err_line: string[] = []
    const out_line: string[] = []
    // https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
    const exit_code = await exec(
      'skopeo',
      // --multi-arch not support under 1.8.0
      // https://github.com/containers/skopeo/commit/4ef35a385af074c979c9f8c4e2e37c38b0963c3a
      // https://github.com/actions/runner-images ubuntu-latest(ubuntu-22.04) skopeo-1.4.1
      ['copy', '--all', sync.source_image, sync.dest_image],
      {
        listeners: {
          errline: (data: string) => err_line.push(data),
          stdline: (data: string) => out_line.push(data)
        }
      }
    )
    core.summary.addRaw(
      `process [${i + 1}/${syncs.length}]: ${sync.fmt()}`,
      true
    )
    if (err_line.length > 0) {
      core.summary.addDetails(':x:', '\n'.repeat(2) + err_line.join('\n'))
    } else if (out_line.length > 0) {
      core.summary.addDetails(
        ':white_check_mark:',
        '\n'.repeat(2) + out_line.join('\n')
      )
    }
    await core.summary.write()
    if (!skip_error && exit_code != 0) {
      throw new Error(
        `sync ${sync.source_image} to ${sync.dest_image} failed: ${err_line.join('\n')}`
      )
    }
  }
}

/**
 * https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
 *
 * @param source_image_name eg. `docker.io/fedora`, `nginx`
 */
export async function list_tag(
  source_image_name: string
): Promise<z.infer<typeof SkopeoListTagsResSchema>> {
  let res = ''
  let err = ''
  const exit_code = await exec(
    'skopeo',
    ['list-tags', `docker://${source_image_name}`],
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

  return SkopeoListTagsResSchema.parse(JSON.parse(res))
}

export async function gen_need_sync_source_images(
  sync_info: ImageSyncInfo
): Promise<string[] | undefined> {
  if (sync_info.type === SyncType.Tag) {
    return sync_info.tag?.map(t => `${sync_info.image}:${t}`)
  }
  if (sync_info.type === SyncType.Digest) {
    return [`${sync_info.image}@${sync_info.digest}`]
  }

  const tag = await list_tag(sync_info.image)

  if (sync_info.type === SyncType.All) {
    return tag.Tags.map(t => `${sync_info.image}:${t}`)
  }

  if (sync_info.type === SyncType.Semver) {
    assert(sync_info.semver, 'Semver must be set')
    return tag.Tags.filter(t =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      satisfies(t, sync_info.semver!)
    ).map(t => `${sync_info.image}:${t}`)
  }

  return tag.Tags.filter(t => sync_info.regex?.test(t)).map(
    t => `${sync_info.image}:${t}`
  )
}

export function cartesian_source_dest_sync_pair(
  source_images: string[],
  dest_images: string[]
): Sync[] {
  return source_images.reduce((acc, cur) => {
    const data = dest_images.map(d => new Sync(cur, d))
    return [...acc, ...data]
  }, [] as Sync[])
}
