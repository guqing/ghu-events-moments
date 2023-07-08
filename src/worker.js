/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import axios from 'axios';
import retry from 'async-retry';
import {
	transformGitHubEventData,
	transformWrappeEventToMoment,
} from './transform';
import fetchAdapter from '@haverstack/axios-fetch-adapter';
import { Octokit } from '@octokit/core';

const axiosClient = axios.create({
	adapter: fetchAdapter,
});

class GithubEventHandler {
	constructor(env) {
		this.githubUsername = env.GITHUB_USERNAME;
		this.haloUsername = env.HALO_USERNAME;
		this.haloPassword = env.HALO_PASSWORD;
		this.haloUrl = env.HALO_URL;
		this.githubToken = env.GITHUB_TOKEN;
		this.eventsStateConfigMapName = 'configmap-github-user-events-state';
		this.githubEventUrl = `https://api.github.com/users/${env.GITHUB_USERNAME}/events/public`;
		this.octokit = new Octokit({ auth: `${env.GITHUB_TOKEN}` });
	}

	async updateEventStateConfigMap(isoDateString) {
		return await retry(
			async (bail) => {
				let configMap = await this.fetchConfigMap(
					this.eventsStateConfigMapName
				);
				if (configMap === null) {
					throw new Error(
						`ConfigMap ${this.eventsStateConfigMapName} not found, please create it first.`
					);
				}
				configMap.data['last-time-created-event'] = isoDateString;
				try {
					const { data } = await axiosClient.put(
						`${this.haloUrl}/api/v1alpha1/configmaps/${this.eventsStateConfigMapName}`,
						configMap,
						{
							...this.haloRequestOptions(),
						}
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
	async syncData(data) {
		await this.createEventStateConfigMapIfAbsent();
		try {
			const moments = transformWrappeEventToMoment(data || []);
			for (const moment of moments) {
				// Using Octokit to render a markdown and update it
				await this.renderAndUpdateMarkdownUsingOctokit(moment);

				const createMoment = axiosClient.post(
					`${this.haloUrl}/apis/api.plugin.halo.run/v1alpha1/plugins/PluginMoments/moments`,
					moment,
					{
						...this.haloRequestOptions(),
					}
				);

				const updateLastProcessedTime = this.updateEventStateConfigMap(
					moment.spec.releaseTime
				);
				const values = await Promise.all([
					createMoment,
					updateLastProcessedTime,
				]);
				const createdMoment = values[0].data;
				console.log(
					'created a moment by github user public event:',
					createdMoment
				);
			}
		} catch (error) {
			console.error('Failed to sync data:', error);
		}
	}

	async renderAndUpdateMarkdownUsingOctokit(moment) {
		const raw = moment.spec.content.raw;
		if (this.isEmpty(raw)) {
			return;
		}
		const markdownResp = await this.octokit.request('POST /markdown', {
			text: raw,
			mode: "gfm",
			headers: {
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
		if (markdownResp.status !== 200) {
			return;
		}
		moment.spec.content.html = markdownResp.data;
	}

	// 定义轮询函数
	async pollData() {
		console.info('Fetch github user public events...', this.githubEventUrl);
		try {
			const response = await axiosClient.get(this.githubEventUrl, {
				headers: {
					'X-GitHub-Api-Version': '2022-11-28',
					Authorization: `Bearer ${this.githubToken}`,
					Accept: 'application/vnd.github+json',
					'User-Agent': 'GuQing-CF-Worker',
				},
			});
			const data = response.data;
			const processedEvents = transformGitHubEventData(data);
			// 过滤出需要同步的数据
			const lastTimeToCreate = await this.getLastProcessdTimeString();
			const result = processedEvents
				.filter((item) => {
					return this.isDateAfter(item.created_at, lastTimeToCreate);
				})
				.filter((item) => !this.isEmpty(item.title))
				.sort((a, b) => (new Date(b) < new Date(a) ? 1 : -1));

			// 调用同步函数将数据发送到目标服务
			await this.syncData(result);
		} catch (error) {
			console.error('Failed to poll data:', error);
		}
	}

	isEmpty(str) {
		return !str || str.trim().length === 0;
	}

	async getLastProcessdTimeString() {
		const configMap = await this.fetchConfigMap(this.eventsStateConfigMapName);
		if (!configMap?.data) {
			return null;
		}
		return configMap.data['last-time-created-event'] || null;
	}

	async fetchConfigMap(name) {
		try {
			const response = await axiosClient.get(
				`${this.haloUrl}/api/v1alpha1/configmaps/${name}`,
				{
					...this.haloRequestOptions(),
				}
			);
			return response.data;
		} catch (error) {
			console.log(error);
			if (error.response && error.response.status === 404) {
				return null;
			}
			throw new Error(error);
		}
	}

	async createEventStateConfigMapIfAbsent() {
		let configMap = await this.fetchConfigMap(this.eventsStateConfigMapName);
		if (configMap != null) {
			return configMap;
		}
		try {
			const { data } = await axiosClient.post(
				`${this.haloUrl}/api/v1alpha1/configmaps`,
				{
					apiVersion: 'v1alpha1',
					kind: 'ConfigMap',
					metadata: {
						name: this.eventsStateConfigMapName,
					},
					data: {},
				},
				{ ...this.haloRequestOptions() }
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

	haloRequestOptions() {
		return {
			timeout: 10000,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${btoa(
					this.haloUsername + ':' + this.haloPassword
				)}`,
			},
		};
	}

	isDateAfter(githubDate, target) {
		return (
			new Date(new Date(githubDate).toISOString()).getTime() >
			new Date(target).getTime()
		);
	}
}

export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx) {
		// A Cron Trigger can make requests to other endpoints on the Internet,
		// publish to a Queue, query a D1 Database, and much more.
		const githubEventHandler = new GithubEventHandler(env);
		await githubEventHandler.pollData();

		// You could store this result in KV, write to a D1 Database, or publish to a Queue.
		// In this template, we'll just log the result:
		console.log(`trigger fired at ${event.cron}`);
	},
};
