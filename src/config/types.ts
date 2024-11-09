import { z } from 'zod'

export const AuthSchema = z.object({
  username: z.string(),
  password: z.string()
})

export const AuthMapSchema = z.record(z.string(), AuthSchema)

export const ImageSyncMapSchema = z.record(
  z.string(),
  z.union([z.string(), z.string().array()]).transform<string[]>(v => {
    if (typeof v === 'string') {
      return [v]
    }
    return v
  })
)

export enum SyncType {
  All,
  Tag,
  Digest,
  Regex
}

export type ImageSyncInfo = {
  type: SyncType
  image: string
  tag?: string[]
  regex?: RegExp
  digest?: string
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
