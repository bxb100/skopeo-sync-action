import { inject_env, parse_yaml } from '../src/utils'
import { expect } from '@jest/globals'
import { AuthMapSchema, ImageSyncMapSchema } from '../src/skopeo/types'

describe('utils', () => {
  it('parse auth yaml', () => {
    const record = parse_yaml('./test/auth.yml', AuthMapSchema)
    expect(record).toMatchSnapshot()
  })

  it('parse image yaml', () => {
    const record = parse_yaml('./test/images.yml', ImageSyncMapSchema)
    console.log(record)
    expect(record).toMatchSnapshot()
  })

  it('inject env', () => {
    process.env.username = 'cs1'
    process.env.password = 'cs2'
    expect(inject_env('  username: ${username}')).toEqual('  username: cs1')
    expect(
      inject_env('  username: ${username} password: ${password} ')
    ).toEqual('  username: cs1 password: cs2 ')
    expect(inject_env('  username: ${px}')).toEqual('  username: ${px}')
    expect(inject_env('  username: $username')).toEqual('  username: cs1')
    expect(inject_env('  username: $px')).toEqual('  username: $px')
  })
})
