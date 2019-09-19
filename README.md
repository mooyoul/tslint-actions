# tslint-actions

[![Build Status](https://github.com/mooyoul/tslint-actions/workflows/workflow/badge.svg)](https://github.com/mooyoul/tslint-actions/actions)
[![Semantic Release enabled](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)
[![MIT license](http://img.shields.io/badge/license-MIT-blue.svg)](http://mooyoul.mit-license.org/)

GitHub action that lints your code with TSLint (with Annotation support)

![Example](example.png)


## Sample Outputs

Please see [PR #2](https://github.com/mooyoul/tslint-actions/pull/2/files), or [Check Run Result](https://github.com/mooyoul/tslint-actions/pull/2/checks?check_run_id=228522505) 

## Sample Github Actions Configuration 

```yaml
name: workflow
on: [push]
jobs:
  job:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: actions/checkout@v1
      - name: Prepare
        run: npm ci
      - name: Lint
        uses: mooyoul/tslint-actions@v1.1.1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          pattern: '*.ts'
```

## License

[MIT](LICENSE)

See full license on [mooyoul.mit-license.org](http://mooyoul.mit-license.org/)
