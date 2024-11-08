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
}

export const SkopeoListTagsResSchema = z.object({
  Repository: z.string(),
  Tags: z.string().array()
})

export type Sync = {
  source_image: string
  dest_image: string
}
