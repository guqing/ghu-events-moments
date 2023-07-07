const {
  transformGitHubEventData,
  transformWrappeEventToMoment,
} = require("./transform");
const axios = require("axios");

const githubUsername = "<your-github-login-name>";
const githubToken = "<your-github-token>";
const blogUrl = "http://localhost:8090";
const blogAuth = {
  username: "<your-halo-username>",
  password: "<your-halo-password>",
};

async function createConfigMap(lastTimeCreatedEvent) {
  const configMap = {
    apiVersion: "v1alpha1",
    kind: "ConfigMap",
    metadata: {
      name: "configmap-github-user-events-state",
    },
    data: {
      "last-time-created-event": lastTimeCreatedEvent,
    },
  };
  const createdConfig = await axios.post(
    `${blogUrl}/api/v1alpha1/configmaps`,
    configMap,
    { ...haloRequestOptions() }
  );
  console.log("createdConfig: ", createdConfig.data);
}

async function syncGithub() {
  try {
    const data = await getPaginatedData(
      `/users/${githubUsername}/events/public?per_page=100`
    );
    const processedEvents = transformGitHubEventData(data);
    const moments = transformWrappeEventToMoment(processedEvents || []);
    for (const moment of moments) {
      const createdMoment = await axios.post(
        `${blogUrl}/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMoments/moments`,
        moment,
        { ...haloRequestOptions() }
      );

      console.log(
        "created a moment by github user public event:",
        createdMoment.data?.metadata.name
      );
    }
  } catch (error) {
    console.error("Failed to sync data:", error);
  }
}

function haloRequestOptions() {
  return {
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
    auth: blogAuth,
  };
}

async function getPaginatedData(url) {
  const nextPattern = /(?<=<)([\S]*)(?=>; rel="Next")/i;
  let pagesRemaining = true;
  let data = [];

  while (pagesRemaining) {
    if (!url.startsWith("https://api.github.com")) {
      url = "https://api.github.com" + url;
    }
    console.log("url: " + url);
    const response = await axios.get(url, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Versio": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });
    const parsedData = parseData(response.data);
    data = [...data, ...parsedData];

    const linkHeader = response.headers.link;

    pagesRemaining = linkHeader && linkHeader.includes(`rel=\"next\"`);

    if (pagesRemaining) {
      url = linkHeader.match(nextPattern)[0];
    }
  }

  return data;
}

function parseData(data) {
  // If the data is an array, return that
  if (Array.isArray(data)) {
    return data;
  }

  // Some endpoints respond with 204 No Content instead of empty array
  //   when there is no data. In that case, return an empty array.
  if (!data) {
    return [];
  }

  // Otherwise, the array of items that we want is in an object
  // Delete keys that don't include the array of items
  delete data.incomplete_results;
  delete data.repository_selection;
  delete data.total_count;
  // Pull out the array of items
  const namespaceKey = Object.keys(data)[0];
  data = data[namespaceKey];

  return data;
}
