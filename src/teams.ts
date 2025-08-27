import { Request, Response } from 'express';
import { TEAMS_SECRET } from './env';
import {
  createIssue,
  assignIssue,
  transitionIssue,
  commentOnIssue,
  getMyUpdates,
} from './jira';

// Types for parsed actions
export type TeamsJiraAction =
  | { type: 'create', project: string, summary: string, priority?: string, assignee?: string, ac?: string }
  | { type: 'assign', project: string, issue: string, assignee: string }
  | { type: 'transition', project: string, issue: string, status: string }
  | { type: 'comment', project: string, issue: string, comment: string }
  | { type: 'updates', project: string, since: string };

function parseTeamsMessage(text: string): TeamsJiraAction | null {
  // Very basic parsing for MVP
  const createMatch = text.match(/^create ticket in (\w+): "([^"]+)"(?: priority (\w+))?(?: assignee (@\w+))?(?: AC: (.+))?/i);
  if (createMatch) {
    return {
      type: 'create',
      project: createMatch[1],
      summary: createMatch[2],
      priority: createMatch[3],
      assignee: createMatch[4],
      ac: createMatch[5],
    };
  }
  const assignMatch = text.match(/^assign (\w+-\d+) to (@\w+)/i);
  if (assignMatch) {
    const [project] = assignMatch[1].split('-');
    return { type: 'assign', project, issue: assignMatch[1], assignee: assignMatch[2] };
  }
  const transitionMatch = text.match(/^update (\w+-\d+): status (.+)/i);
  if (transitionMatch) {
    const [project] = transitionMatch[1].split('-');
    return { type: 'transition', project, issue: transitionMatch[1], status: transitionMatch[2] };
  }
  const commentMatch = text.match(/^comment (\w+-\d+): "([^"]+)"/i);
  if (commentMatch) {
    const [project] = commentMatch[1].split('-');
    return { type: 'comment', project, issue: commentMatch[1], comment: commentMatch[2] };
  }
  const updatesMatch = text.match(/^my updates since (.+)/i);
  if (updatesMatch) {
    // For MVP, require project mention elsewhere in the message
    const projectMatch = text.match(/in (\w+)/i);
    return projectMatch ? { type: 'updates', project: projectMatch[1], since: updatesMatch[1] } : null;
  }
  return null;
}

export async function handleTeamsWebhook(req: Request, res: Response) {
  const provided = req.headers['x-teams-secret'] || req.query.secret;
  if (!TEAMS_SECRET || provided !== TEAMS_SECRET) {
    return res.status(401).send('Unauthorized');
  }
  const text = req.body.text || '';
  const parsed = parseTeamsMessage(text);
  console.log('Received Teams webhook:', { text, parsed });

  if (!parsed) {
    return res.status(200).send('Could not parse action.');
  }

  try {
    switch (parsed.type) {
      case 'create':
        await createIssue(parsed);
        break;
      case 'assign':
        await assignIssue(parsed);
        break;
      case 'transition':
        await transitionIssue(parsed);
        break;
      case 'comment':
        await commentOnIssue(parsed);
        break;
      case 'updates':
        await getMyUpdates(parsed);
        break;
    }
    res.status(200).send(`Action '${parsed.type}' received and parsed.`);
  } catch (err) {
    console.error('Error handling Teams action:', err);
    res.status(500).send('Error processing action.');
  }
}
