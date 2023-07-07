const axios = require("axios");
const retry = require("async-retry");

var cron = require('node-cron');
const {
  transformGitHubEventData,
  transformWrappeEventToMoment,
} = require("./transform");

const haloUsername = process.env.HALO_USERNAME;
const haloPassword = process.env.HALO_PASSWORD;
const haloUrl = process.env.HALO_URL;
const githubToken = process.env.GITHUB_TOKEN;

// 需要同步的 GitHub 用户名和 API 地址
const githubUsername = process.env.GITHUB_USERNAME;
// 轮询间隔，单位毫秒，默认 30 分钟
const pollInterval = process.env.POLL_INTERVAL || 1000 * 60 * 30;

const githubEventUrl = `https://api.github.com/users/${githubUsername}/events/public?per_page=100`;
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
  console.info("Fetch github user public events...");
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

cron.schedule('* * * * *', async () => {
  await pollData()
  console.log('running a task every minute');
});