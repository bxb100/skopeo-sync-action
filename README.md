# Using Skopeo to async image action

[![GitHub Super-Linter](https://github.com/bxb100/skopeo-sync-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/bxb100/skopeo-sync-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/bxb100/skopeo-sync-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/bxb100/skopeo-sync-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/bxb100/skopeo-sync-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/bxb100/skopeo-sync-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Use [skopeo](https://github.com/containers/skopeo) to sync images between docker
registries.

## example

```yaml
name: Sync docker images

on:
  workflow_dispatch:
  schedule:
    # every day at 7am & 7pm pacific
    - cron: '0 2,14 * * *'

jobs:
  sync-images:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - uses: ./
        with:
          auth_file: ./auth.yml
          images_file: ./images.yml
          skip_error: true
```

<!-- FUCK ALI https://github.com/AliyunContainerService/image-syncer/issues/161 -->
