const transformGitHubEventData = function (events) {
  return events.map((event) => {
    let title = "";
    let content = "";
    switch (event.type) {
      case "CommitCommentEvent":
        title = `${event.actor.display_login} commented on commit ${event.payload.comment.commit_id} in ${event.repo.name}`;
        content = event.payload.comment.body;
        break;
      case "CreateEvent":
        title = `${event.actor.display_login} created ${event.payload.ref_type} ${event.payload.ref} in ${event.repo.name}`;
        break;
      case "DeleteEvent":
        title = `${event.actor.display_login} deleted ${event.payload.ref_type} ${event.payload.ref} in ${event.repo.name}`;
        break;
      case "ForkEvent":
        title = `${event.actor.display_login} forked ${event.repo.name}`;
        break;
      case "GollumEvent":
        title = `${event.actor.display_login} ${event.payload.pages[0].action} the ${event.payload.pages[0].page_name} page in ${event.repo.name}`;
        content = event.payload.pages
          .map(
            (page) => `- [${page.page_name}](${page.html_url})\n${page.summary}`
          )
          .join("\n");
        break;
      case "InstallationEvent":
        title = `${event.actor.display_login} ${event.payload.action} ${event.payload.installation.account.login} to ${event.payload.installation.account.type} ${event.payload.installation.id}`;
        break;
      case "InstallationRepositoriesEvent":
        title = `${event.actor.display_login} ${event.payload.action} ${event.payload.repositories.length} repositories to installation ${event.payload.installation.id}`;
        content = event.payload.repositories
          .map((repo) => `- [${repo.full_name}](${repo.html_url})`)
          .join("\n");
        break;
      case "IssueCommentEvent":
        title = `${event.actor.display_login} commented on issue ${event.payload.issue.number} in ${event.repo.name}`;
        content = event.payload.comment.body;
        break;
      case "IssuesEvent":
        title = `${event.actor.display_login} ${event.payload.action} issue ${event.payload.issue.number} in ${event.repo.name}`;
        content = event.payload.issue.body;
        break;
      case "LabelEvent":
        title = `${event.actor.display_login} ${event.payload.action} label ${event.payload.label.name} in ${event.repo.name}`;
        break;
      case "MarketplacePurchaseEvent":
        title = `${event.actor.display_login} purchased ${event.payload.marketplace_purchase.plan.name} in the ${event.payload.marketplace_purchase.account.type} ${event.payload.marketplace_purchase.account.login} marketplace`;
        break;
      case "MemberEvent":
        title = `${event.actor.display_login} ${event.payload.action} ${event.payload.member.login} as a collaborator to ${event.repo.name}`;
        break;
      case "MembershipEvent":
        title = `${event.actor.display_login} ${event.payload.action} member ${event.payload.member.login} to team ${event.payload.team.name} in ${event.payload.repository.full_name}`;
        break;
      case "MilestoneEvent":
        title = `${event.actor.display_login} ${event.payload.action} milestone ${event.payload.milestone.title} in ${event.repo.name}`;
        content = event.payload.milestone.description;
        break;
      case "OrganizationEvent":
        title = `${event.actor.display_login} ${event.payload.action} organization ${event.payload.organization.login}`;
        break;
      case "OrgBlockEvent":
        title = `${event.actor.display_login} ${event.payload.action} user ${event.payload.blocked_user.login} from ${event.payload.organization.login}`;
        break;
      case "PageBuildEvent":
        title = `${event.actor.display_login} built pages for ${event.repo.name}`;
        break;
      case "ProjectCardEvent":
        title = `${event.actor.display_login} ${event.payload.action} a card in project ${event.payload.project_card.project.name} in ${event.repo.name}`;
        content = event.payload.project_card.note;
        break;
      case "ProjectColumnEvent":
        title = `${event.actor.display_login} ${event.payload.action} column ${event.payload.project_column.name} in project ${event.payload.project_column.project.name} in ${event.repo.name}`;
        break;
      case "ProjectEvent":
        title = `${event.actor.display_login} ${event.payload.action} project ${event.payload.project.name} in ${event.repo.name}`;
        break;
      case "PublicEvent":
        title = `${event.actor.display_login} has made ${event.repo.name} public`;
        break;
      case "PullRequestEvent":
        title = `${event.actor.display_login} ${event.payload.action} pull request ${event.payload.pull_request.number} in ${event.repo.name}`;
        content = event.payload.pull_request.body;
        break;
      case "PullRequestReviewEvent":
        title = `${event.actor.display_login} ${event.payload.action} a review on pull request ${event.payload.pull_request.number} in ${event.repo.name}`;
        content = event.payload.review.body;
        break;
      case "PullRequestReviewCommentEvent":
        title = `${event.actor.display_login} commented on pull request ${event.payload.pull_request.number} in ${event.repo.name}`;
        content = event.payload.comment.body;
        break;
      case "PushEvent":
        title = `${event.actor.display_login} pushed to ${event.payload.ref
          .split("/")
          .pop()} in ${event.repo.name}`;
        content = event.payload.commits
          .map((commit) => {
            return `- ${commit.message} ([${commit.sha.slice(0, 7)}](${
              commit.url
            }))`;
          })
          .join("\n");
        break;
      case "ReleaseEvent":
        title = `${event.actor.display_login} ${event.payload.action} release ${event.payload.release.tag_name} in ${event.repo.name}`;
        content = event.payload.release.body;
        break;
      case "RepositoryEvent":
        title = `${event.actor.display_login} ${event.payload.action} repository ${event.repo.name}`;
        break;
      case "StatusEvent":
        title = `${event.actor.display_login} set ${
          event.payload.state
        } status on commit ${event.sha.slice(0, 7)} in ${event.repo.name}`;
        content = event.payload.description;
        break;
      case "WatchEvent":
        title = `${event.actor.display_login} starred ${event.repo.name}`;
        break;
      default:
        title = `${event.type} event occurred in ${event.repo.name}`;
        break;
    }
    return { title, content };
  });
};

module.exports = { transformGitHubEventData };
