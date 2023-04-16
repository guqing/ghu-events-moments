const axios = require("axios");
const fs = require("fs");
const retry = require("async-retry");

const { setIntervalAsync } = require("set-interval-async");
const { clearIntervalAsync } = require("set-interval-async/dynamic");
const {
  transformGitHubEventData,
  transformWrappeEventToMoment,
} = require("./transform");

const haloUsername = process.env.HALO_USERNAME || "guqing";
const haloPassword = process.env.HALO_PASSWORD || "123456";
const haloUrl = process.env.HALO_URL || "http://127.0.0.1:8090";

const githubToken =
  process.env.GITHUB_TOKEN ||
  "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";
// 需要同步的 GitHub 用户名和 API 地址
const githubUsername = process.env.GITHUB_USERNAME || "guqing";
const githubEventUrl = `https://api.github.com/users/${githubUsername}/events/public?per_page=30`;
const eventsStateConfigMapName = "configmap-github-user-events-state";

async function updateEventStateConfigMap(isoDateString) {
  return await retry(
    async (bail) => {
      let configMap = await fetchConfigMap(eventsStateConfigMapName);
      if (configMap === null) {
        throw new Error(
          `ConfigMap ${eventsStateConfigMapName} not found, please create it first.`
        );
      }
      configMap.data["last-time-created-event"] = isoDateString;
      try {
        const { data } = await axios.put(
          `${haloUrl}/api/v1alpha1/configmaps/${eventsStateConfigMapName}`,
          configMap,
          { ...haloRequestOptions() }
        );
        return data;
      } catch (error) {
        bail(new Error(error));
        return null;
      }
    },
    {
      retries: 10,
    }
  );
}

// 定义同步函数，将数据发送到目标服务
async function syncData(data) {
  await createEventStateConfigMapIfAbsent();
  try {
    const moments = transformWrappeEventToMoment(data || []);
    for (const moment of moments) {
      const createMoment = axios.post(
        `${haloUrl}/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMoments/moments`,
        moment,
        { ...haloRequestOptions() }
      );

      const updateLastProcessedTime = updateEventStateConfigMap(
        moment.spec.releaseTime
      );
      const values = await Promise.all([createMoment, updateLastProcessedTime]);
      const createdMoment = values[0].data;
      console.log(
        "created a moment by github user public event:",
        createdMoment
      );
    }
  } catch (error) {
    console.error("Failed to sync data:", error);
  }
}

// 定义轮询函数
async function pollData() {
  console.info('Fetch github user public events...')
  try {
    const response = await axios.get(githubEventUrl, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Versio": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });
    const data = response.data;
    const processedEvents = transformGitHubEventData(data);
    // 过滤出需要同步的数据
    const lastTimeToCreate = await getLastProcessdTimeString();
    const result = processedEvents
      .filter((item) => {
        return isDateAfter(item.created_at, lastTimeToCreate);
      })
      .filter((item) => !isEmpty(item.title))
      .sort((a, b) => (new Date(b) < new Date(a) ? 1 : -1));

    // 调用同步函数将数据发送到目标服务
    await syncData(result);
  } catch (error) {
    console.error("Failed to poll data:", error);
  }
}

function isEmpty(str) {
  return !str || str.trim().length === 0;
}

async function getLastProcessdTimeString() {
  const configMap = await fetchConfigMap(eventsStateConfigMapName);
  if (!configMap || !configMap.data) {
    return null;
  }
  return configMap.data["last-time-created-event"] || null;
}

async function fetchConfigMap(name) {
  try {
    const response = await axios.get(
      `${haloUrl}/api/v1alpha1/configmaps/${name}`,
      {
        ...haloRequestOptions(),
      }
    );
    return response.data;
  } catch (error) {
    const errorJson = error.toJSON() || {};
    if (errorJson.status === 404) {
      return null;
    }
    throw new Error(error);
  }
}

async function createEventStateConfigMapIfAbsent() {
  let configMap = await fetchConfigMap(eventsStateConfigMapName);
  if (configMap != null) {
    return configMap;
  }
  try {
    const { data } = await axios.post(
      `${haloUrl}/api/v1alpha1/configmaps`,
      {
        apiVersion: "v1alpha1",
        kind: "ConfigMap",
        metadata: {
          name: eventsStateConfigMapName,
        },
        data: {},
      },
      { ...haloRequestOptions() }
    );
    return data;
  } catch (error) {
    const errorJson = error?.toJSON() || {};
    if (errorJson.status !== 400) {
      throw new Error(error);
    }
  }
  return configMap;
}

function haloRequestOptions() {
  return {
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
    auth: {
      username: haloUsername,
      password: haloPassword,
    },
  };
}

function isDateAfter(githubDate, target) {
  return (
    new Date(new Date(githubDate).toISOString()).getTime() >
    new Date(target).getTime()
  );
}

// 启动轮询任务
const pollInterval = 10 * 1000; // 轮询间隔为 1 分钟
const pollTimer = setIntervalAsync(pollData, pollInterval);

// 在程序退出时清除轮询任务
process.on("SIGINT", async () => {
  console.log("Stopping poller...");
  await clearIntervalAsync(pollTimer);
  console.log("Poller stopped.");
  process.exit();
});
