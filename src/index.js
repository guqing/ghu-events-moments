const axios = require("axios");
const { setIntervalAsync } = require("set-interval-async");
const { clearIntervalAsync } = require("set-interval-async/dynamic");

// 需要同步的 GitHub 用户名和 API 地址
const username = "guqing";
const githubToken = "";
const url = `https://api.github.com/users/${username}/events/public`;

// 定义同步函数，将数据发送到目标服务
async function syncData(data) {
  try {
    // TODO: 将数据发送到目标服务的代码
    console.log("Synced data:", data);
  } catch (error) {
    console.error("Failed to sync data:", error);
  }
}

// 定义轮询函数
async function pollData() {
  try {
    const response = await axios.get(url, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Versio": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });
    const data = response.data;

    // TODO: 过滤出需要同步的数据

    // 调用同步函数将数据发送到目标服务
    await syncData(data);
  } catch (error) {
    console.error("Failed to poll data:", error);
  }
}

function transformGithubUserPublicEvent2Moment(githubEvent) {
  
}


// 启动轮询任务
const pollInterval = 60 * 1000; // 轮询间隔为 1 分钟
const pollTimer = setIntervalAsync(pollData, pollInterval);

// 在程序退出时清除轮询任务
process.on("SIGINT", async () => {
  console.log("Stopping poller...");
  await clearIntervalAsync(pollTimer);
  console.log("Poller stopped.");
  process.exit();
});
