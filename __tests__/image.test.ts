import { parseDocument } from 'yaml'
import { expect } from '@jest/globals'
import { sync_type } from '../src/config/image'
import { ImageSyncMapSchema, SyncType } from '../src/config/types'

describe('Image', () => {
  it('parse yaml file', () => {
    const content = `
quay.io/coreos/kube-rbac-proxy: quay.io/ruohe/kube-rbac-proxy
quay.io/coreos/kube-rbac-proxy:v1.0: quay.io/ruohe/kube-rbac-proxy
quay.io/coreos/kube-rbac-proxy:v1.0,v2.0: quay.io/ruohe/kube-rbac-proxy
quay.io/coreos/kube-rbac-proxy@sha256:14b267eb38aa85fd12d0e168fffa2d8a6187ac53a14a0212b0d4fce8d729598c: quay.io/ruohe/kube-rbac-proxy
quay.io/coreos/kube-rbac-proxy:v1.1:
  - quay.io/ruohe/kube-rbac-proxy1
  - quay.io/ruohe/kube-rbac-proxy2
quay.io/coreos/kube-rbac-proxy:/a+/: quay.io/ruohe/kube-rbac-proxy
    `
    const doc = parseDocument(content)
    const res = ImageSyncMapSchema.parse(doc.toJS())
    expect(res).toMatchSnapshot()
  })

  it('sync type', () => {
    let image = 'quay.io/coreos/kube-rbac-proxy'
    expect(sync_type(image).type).toEqual(SyncType.All)

    image = 'quay.io/coreos/kube-rbac-proxy:v1.0'
    expect(sync_type(image).type).toEqual(SyncType.Tag)

    image = 'quay.io/coreos/kube-rbac-proxy:v1.0,v2.0'
    expect(sync_type(image).type).toEqual(SyncType.Tag)

    image =
      'quay.io/coreos/kube-rbac-proxy@sha256:14b267eb38aa85fd12d0e168fffa2d8a6187ac53a14a0212b0d4fce8d729598c'
    expect(sync_type(image).type).toEqual(SyncType.Digest)

    image = 'quay.io/coreos/kube-rbac-proxy:/a+/'
    expect(sync_type(image).type).toEqual(SyncType.Regex)
  })
})