# ghu-events-moments

部署到 Vercel 后需要填写环境变量：

- HALO_USERNAME: 博客的用户名
- HALO_PASSWORD: 博客的密码
- HALO_URL: 博客的域名
- GITHUB_TOKEN: GitHub 的 Personal Access Token 需要用来获取用户的 events 信息，GitHub 对没有 token 的 API 访问会有限制
- GITHUB_USERNAME: GitHub 的用户名
- POLL_INTERVAL: 同步周期，默认为 30 分钟
