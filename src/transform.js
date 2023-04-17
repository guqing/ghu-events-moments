const md = require("markdown-it")({
  html: true,
  linkify: true,
  breaks: true,
});

const transformGitHubEventData = function (events) {
  return events
    .map((event) => {
      let title = "";
      let content = "";
      const displayLogin = `<a href="${event.actor?.url}">${event.actor?.display_login}</a>`;
      switch (event.type) {
        case "CommitCommentEvent":
          title = `${displayLogin} commented on commit ${
            event.payload.comment.commit_id
          } in ${wrapRepo(event.repo)}`;
          content = event.payload.comment.body;
          break;
        case "CreateEvent":
          title = `${displayLogin} created ${event.payload.ref_type} ${
            event.payload.ref
          } in ${wrapRepo(event.repo)}`;
          content = repoToContent(event);
          break;
        // case "DeleteEvent":
        //   title = `${displayLogin} deleted ${event.payload.ref_type} ${
        //     event.payload.ref
        //   } in ${wrapRepo(event.repo)}`;
        //   content = `#### [${event.repo.name}](${event.repo.url})\r\n${event.payload.description}`
        //   break;
        case "ForkEvent":
          title = `${displayLogin} forked ${wrapRepo(event.repo)}`;
          content = repoToContent(event);
          break;
        case "GollumEvent":
          title = `${displayLogin} ${event.payload.pages[0].action} the ${
            event.payload.pages[0].page_name
          } page in ${wrapRepo(event.repo)}`;
          content = event.payload.pages
            .map(
              (page) =>
                `- [${page.page_name}](${page.html_url})\n${page.summary}`
            )
            .join("\n");
          break;
        // case "InstallationEvent":
        //   title = `${displayLogin} ${event.payload.action} ${event.payload.installation.account.login} to ${event.payload.installation.account.type} ${event.payload.installation.id}`;
        //   content = `#### [${event.repo.name}](${event.repo.url})\r\n${event.payload.description}`
        //   break;
        // case "InstallationRepositoriesEvent":
        //   title = `${displayLogin} ${event.payload.action} ${event.payload.repositories.length} repositories to installation ${event.payload.installation.id}`;
        //   content = event.payload.repositories
        //     .map((repo) => `- [${repo.full_name}](${repo.html_url})`)
        //     .join("\n");
        //   break;
        case "IssueCommentEvent":
          title = `${displayLogin} commented on issue ${wrapIssue(
            event.payload.issue
          )} in ${wrapRepo(event.repo)}`;
          content = event.payload.comment.body;
          break;
        case "IssuesEvent":
          title = `${displayLogin} ${event.payload.action} issue ${wrapIssue(
            event.payload.issue
          )} in ${wrapRepo(event.repo)}`;
          content = event.payload.issue.body;
          break;
        // case "LabelEvent":
        //   title = `${displayLogin} ${event.payload.action} label ${
        //     event.payload.label.name
        //   } in ${wrapRepo(event.repo)}`;
        //   break;
        // case "MarketplacePurchaseEvent":
        //   title = `${displayLogin} purchased ${event.payload.marketplace_purchase.plan.name} in the ${event.payload.marketplace_purchase.account.type} ${event.payload.marketplace_purchase.account.login} marketplace`;
        //   break;
        case "MemberEvent":
          title = `${displayLogin} ${event.payload.action} ${
            event.payload.member.login
          } as a collaborator to ${wrapRepo(event.repo)}`;
          content = repoToContent(event);
          break;
        case "MembershipEvent":
          title = `${displayLogin} ${event.payload.action} member ${event.payload.member.login} to team ${event.payload.team.name} in ${event.payload.repository.full_name}`;
          content = repoToContent(event);
          break;
        // case "MilestoneEvent":
        //   title = `${displayLogin} ${event.payload.action} milestone ${
        //     event.payload.milestone.title
        //   } in ${wrapRepo(event.repo)}`;
        //   content = event.payload.milestone.description;
        //   break;
        // case "OrganizationEvent":
        //   title = `${displayLogin} ${event.payload.action} organization ${event.payload.organization.login}`;
        //   break;
        // case "OrgBlockEvent":
        //   title = `${displayLogin} ${event.payload.action} user ${event.payload.blocked_user.login} from ${event.payload.organization.login}`;
        //   break;
        // case "PageBuildEvent":
        //   title = `${displayLogin} built pages for ${wrapRepo(event.repo)}`;
        //   break;
        // case "ProjectCardEvent":
        //   title = `${displayLogin} ${event.payload.action} a card in project ${
        //     event.payload.project_card.project.name
        //   } in ${wrapRepo(event.repo)}`;
        //   content = event.payload.project_card.note;
        //   break;
        // case "ProjectColumnEvent":
        //   title = `${displayLogin} ${event.payload.action} column ${
        //     event.payload.project_column.name
        //   } in project ${event.payload.project_column.project.name} in ${wrapRepo(
        //     event.repo
        //   )}`;
        //   break;
        // case "ProjectEvent":
        //   title = `${displayLogin} ${event.payload.action} project ${
        //     event.payload.project.name
        //   } in ${wrapRepo(event.repo)}`;
        //   break;
        case "PublicEvent":
          title = `${displayLogin} has made ${wrapRepo(event.repo)} public`;
          content = repoToContent(event);
          break;
        case "PullRequestEvent":
          title = `${displayLogin} ${
            event.payload.action
          } pull request ${wrapPR(event.payload.pull_request)} in ${wrapRepo(
            event.repo
          )}`;
          content = event.payload.pull_request.body;
          break;
        case "PullRequestReviewEvent":
          title = `${displayLogin} ${
            event.payload.action
          } a review on pull request ${wrapPR(
            event.payload.pull_request
          )} in ${wrapRepo(event.repo)}`;
          content = event.payload.review.body;
          break;
        case "PullRequestReviewCommentEvent":
          title = `${displayLogin} commented on pull request ${wrapPR(
            event.payload.pull_request
          )} in ${wrapRepo(event.repo)}`;
          content = event.payload.comment.body;
          break;
        case "PushEvent":
          title = `${displayLogin} pushed to ${event.payload.ref
            .split("/")
            .pop()} in ${wrapRepo(event.repo)}`;
          content =
            "Below is the list of commits:\n" +
            event.payload.commits
              .map((commit) => {
                const prefix = "https://api.github.com/repos/";
                const htmlUrl = `https://github.com/${commit.url.slice(
                  prefix.length
                )}`;
                const commitSha = `[${commit.sha.slice(0, 7)}](${htmlUrl})`;
                const commitMessage = getFirstLine(commit.message);
                console.log("commit:", commitMessage);
                return `- ${commitMessage} (${commitSha})`;
              })
              .join("\n");
          break;
        case "ReleaseEvent":
          title = `${displayLogin} ${event.payload.action} release ${
            event.payload.release.tag_name
          } in ${wrapRepo(event.repo)}`;
          content = event.payload.release.body;
          break;
        case "RepositoryEvent":
          title = `${displayLogin} ${
            event.payload.action
          } repository ${wrapRepo(event.repo)}`;
          content = repoToContent(event);
          break;
        case "StatusEvent":
          title = `${displayLogin} set ${
            event.payload.state
          } status on commit ${event.sha.slice(0, 7)} in ${wrapRepo(
            event.repo
          )}`;
          content = event.payload.description;
          break;
        case "WatchEvent":
          title = `${displayLogin} starred ${wrapRepo(event.repo)}`;
          content = repoToContent(event);
          break;
        default:
          title = null;
          content = null;
          break;
      }
      if (title == null || content === null) {
        return null;
      }
      const created_at = event.created_at || new Date().toISOString();
      const html_content = md.render(content || "");
      return {
        id: event.id,
        title,
        raw: content,
        content: html_content,
        created_at,
      };
    })
    .filter((item) => item !== null);
};

function repoToContent(event) {
  if (!event.repo) {
    return "";
  }
  const repoUrl = `https://github.com/${event.repo.name}`;
  return `#### [${event.repo.name}](${repoUrl})\r\n${
    event.payload?.description || ""
  }`;
}

function wrapRepo(repo) {
  if (!repo) {
    return "";
  }
  return `<a href="https://github.com/${repo.name}" target="_blank" rel="noopener">${repo.name}</a>`;
}
function wrapPR(pull_request) {
  if (!pull_request) {
    return "";
  }
  return `<a href="${pull_request.html_url}" title="${pull_request.title}" target="_blank" rel="noopener">#${pull_request.number}</a>`;
}

function wrapIssue(issue) {
  if (!issue) {
    return "";
  }
  return `<a href="${issue.html_url}" title="${issue.title}" target="_blank" rel="noopener">#${issue.number}</a>`;
}

function transformWrappeEventToMoment(wrappedEvents) {
  return wrappedEvents.map((item) => {
    return {
      spec: {
        content: { raw: `${item.raw}`, html: `${item.content}`, medium: [] },
        releaseTime: new Date(item.created_at).toISOString(),
      },
      metadata: {
        generateName: "moment-",
        labels: {
          "guqing.github.io/type": "github-user-public-event",
        },
        annotations: {
          "guqing.github.io/event-id": `${item.id}`,
          "guqing.github.io/customize-title": `${item.title}`,
        },
      },
      kind: "Moment",
      apiVersion: "moment.halo.run/v1alpha1",
    };
  });
}

function getFirstLine(text) {
  const index = text.indexOf('\n');
  if (index !== -1) {
    return text.substr(0, index);
  }
  return text;
}

module.exports = { transformGitHubEventData, transformWrappeEventToMoment };
