import { inject_env, lexer, parse_yaml } from '../src/utils'
import { expect } from '@jest/globals'
import { AuthMapSchema, ImageSyncMapSchema } from '../src/skopeo/types'

describe('utils', () => {
  it('parse auth yaml', () => {
    const record = parse_yaml('./test/auth.yml', AuthMapSchema)
    expect(record).toMatchSnapshot()
  })

  it('parse image yaml', () => {
    const record = parse_yaml('./test/images.yml', ImageSyncMapSchema)
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

  it('lexer test', () => {
    expect(lexer('')).toMatchSnapshot()
    expect(lexer('cs')).toMatchSnapshot()
    expect(lexer('  username: ${username}  ')).toMatchSnapshot()
    expect(lexer('  username: ${username}')).toMatchSnapshot()
    expect(lexer('${username}')).toMatchSnapshot()
    expect(
      lexer('  username: ${username} password: ${password} ')
    ).toMatchSnapshot()
    expect(lexer('$username')).toMatchSnapshot()
    expect(lexer('cs $ cs')).toMatchSnapshot()
    expect(lexer('cs $')).toMatchSnapshot()
    expect(lexer('cs $name$pw')).toMatchSnapshot()
    expect(lexer('cs $name $pw')).toMatchSnapshot()
    expect(lexer('cs $name $pw ')).toMatchSnapshot()

    // failed
    expect(lexer('$[[username]]]')).toMatchSnapshot() // except
    expect(() => lexer('$[{username}] ', true)).toThrow(
      'Invalid bracket, pre: [, cur: {'
    )
    expect(() => lexer('$[username}', true)).toThrow(
      'Invalid correspond bracket, except: ], cur: }'
    )
    expect(() => lexer('${username')).toThrow('Not valid sentence')
    expect(() => lexer('${{username}')).toThrow('Not valid sentence')
  })
})
