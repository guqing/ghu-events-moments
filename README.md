# ghu-events-moments

使用此仓库需要先安装 [plugin-moments](https://github.com/halo-sigs/plugin-moments) 插件且是需要支持 Tag 功能的版本。

部署到 CloudFlare 的 Worker 后需要填写环境变量，或者修改 `wrangler.toml` 文件中的 `vars` 字段。

- HALO_TOKEN: 博客的个人令牌
- HALO_URL: 博客的域名
- GITHUB_TOKEN: GitHub 的 Personal Access Token 需要用来获取用户的 events 信息，GitHub 对没有 token 的 API 访问会有限制
- GITHUB_USERNAME: GitHub 的用户名

```shell
wrangler deploy
```

同步了 GitHub 的 User public events 之后会自动在 Halo 上创建一个 ConfigMap 名称为 `configmap-github-user-events-state` 并且在
每次同步后会更新 ConfigMap 的 data 中 key 为 `last-time-created-event` 的值为 event 处理时间，以确保不会重复创建到 Moment。

如果你想先同步历史的 Events 则可以使用 `src/sync-history-events.js` 中的 `syncGithub` 方法，然后在调用其中的 `createConfigMap` 方法将最后处理时间保存到 Halo 中再使用 worker。
