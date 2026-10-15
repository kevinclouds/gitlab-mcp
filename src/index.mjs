#!/usr/bin/env node

import { loadConfig } from './core/config.mjs';
import { createGitLabClient } from './core/client.mjs';
import { createGuard } from './core/guard.mjs';
import { readMessages, writeMessage } from './server/protocol.mjs';
import { createServer } from './server/server.mjs';
import { createToolRegistry } from './tools/registry.mjs';
import { registerMetadataTools } from './tools/metadata.mjs';
import { registerProjectTools } from './tools/projects.mjs';
import { registerGroupTools } from './tools/groups.mjs';
import { registerMemberTools } from './tools/members.mjs';
import { registerAccessRequestTools } from './tools/access-requests.mjs';
import { registerIssueTools } from './tools/issues.mjs';
import { registerMergeRequestTools } from './tools/merge-requests.mjs';
import { registerNoteTools } from './tools/notes.mjs';
import { registerRepositoryTools } from './tools/repository.mjs';
import { registerBranchTools } from './tools/branches.mjs';
import { registerCommitTools } from './tools/commits.mjs';
import { registerTagTools } from './tools/tags.mjs';
import { registerLabelTools } from './tools/labels.mjs';
import { registerMilestoneTools } from './tools/milestones.mjs';
import { registerSnippetTools } from './tools/snippets.mjs';
import { registerUserTools } from './tools/users.mjs';
import { registerTodoTools } from './tools/todos.mjs';

const modules = [
  registerMetadataTools,
  registerProjectTools,
  registerGroupTools,
  registerMemberTools,
  registerAccessRequestTools,
  registerIssueTools,
  registerMergeRequestTools,
  registerNoteTools,
  registerRepositoryTools,
  registerBranchTools,
  registerCommitTools,
  registerTagTools,
  registerLabelTools,
  registerMilestoneTools,
  registerSnippetTools,
  registerUserTools,
  registerTodoTools
];

const config = loadConfig();
const client = createGitLabClient(config);
const guard = createGuard(config);
const tools = createToolRegistry({ client, config, guard, modules });
const server = createServer({ config, tools });

for await (const request of readMessages(process.stdin)) {
  const response = await server.handle(request);
  if (response) writeMessage(process.stdout, response);
}
