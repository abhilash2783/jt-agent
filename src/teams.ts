import { Request, Response } from 'express';
import { TEAMS_SECRET, TEAMS_REPLY_WEBHOOK_URL } from './env';
import fetch from 'node-fetch';
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
  | { type: 'updates', project: string, since: string, user?: string };

function extractPlainTextFromTeams(text: string): string {
  // Remove all HTML tags
  let cleaned = text.replace(/<[^>]+>/g, '');
  // Replace &nbsp; with space
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  // Remove the bot mention (e.g., 'jt-agent') at the start
  cleaned = cleaned.replace(/^jt-agent\s*/i, '');
  return cleaned;
}

async function postToTeamsChannel(message: string) {
  if (!TEAMS_REPLY_WEBHOOK_URL) return;
  try {
    await fetch(TEAMS_REPLY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error('Failed to post to Teams channel:', err);
  }
}

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
    return { type: 'comment', project: commentMatch[1], comment: commentMatch[2], issue: commentMatch[1] };
  }
  // Updated regex for updates with optional user
  const updatesMatch = text.match(/^my updates since (.+) in (\w+)(?: for (@\w+))?/i);
  if (updatesMatch) {
    return {
      type: 'updates',
      since: updatesMatch[1],
      project: updatesMatch[2],
      user: updatesMatch[3] ? updatesMatch[3].replace(/^@/, '') : undefined,
    };
  }
  return null;
}

export async function handleTeamsWebhook(req: Request, res: Response) {
  // Debug: log raw body and headers
  console.log('Raw Teams webhook body:', req.body);
  console.log('Headers:', req.headers);

  // const provided = req.headers['x-teams-secret'] || req.query.secret;
  // if (!TEAMS_SECRET || provided !== TEAMS_SECRET) {
  //   return res.status(401).send('Unauthorized');
  // }
  const rawText = req.body.text || '';
  const text = extractPlainTextFromTeams(rawText);
  console.log('Cleaned Teams text:', text);
  const parsed = parseTeamsMessage(text);
  console.log('Received Teams webhook:', { rawText, text, parsed });

  // Always send a dummy reply to the Teams channel
  await postToTeamsChannel('✅ Received your request!');

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
