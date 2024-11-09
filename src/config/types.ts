import { z } from 'zod'

export const AuthSchema = z.object({
  username: z.string(),
  password: z.string()
})

export const AuthMapSchema = z.record(z.string(), AuthSchema)

const _DestSchema = z
  .string()
  .or(z.string().array())
  .transform(v => {
    if (typeof v === 'string') {
      return [v]
    }
    return v
  })

export const ImageSyncSemverSchema = z.object({
  semver: z.string().or(z.number().transform(String)),
  dest: _DestSchema
})

export const ImageSyncRegexSchema = z.object({
  regex: z.string(),
  dest: _DestSchema
})

export const ImageSyncValSchema = _DestSchema
  .or(ImageSyncSemverSchema)
  .or(ImageSyncRegexSchema)

export const ImageSyncMapSchema = z.record(z.string(), ImageSyncValSchema)

export enum SyncType {
  All,
  Tag,
  Digest,
  Regex,
  Semver
}

export type ImageSyncInfo = {
  type: SyncType
  image: string
  tag?: string[]
  regex?: RegExp
  digest?: string
  semver?: string
}

export const SkopeoListTagsResSchema = z.object({
  Repository: z.string(),
  Tags: z.string().array()
})

export class Sync {
  source_image: string
  dest_image: string
  private readonly ori_s: string
  private readonly ori_d: string

  constructor(source_image: string, dest_image: string) {
    this.ori_s = source_image
    this.ori_d = dest_image
    this.source_image = `docker://${source_image}`
    this.dest_image = `docker://${dest_image}`
  }

  fmt(): string {
    const d = this.ori_d.split('/')[0]
    return `sync ${this.ori_s} to ${d}`
  }
}
