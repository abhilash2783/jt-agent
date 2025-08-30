import { Request, Response } from 'express';
import { JIRA_SECRET } from './env';
import { JIRA_BASE_URL, JIRA_USER, JIRA_TOKEN } from './env';
import fetch from 'node-fetch';

// Later: import fetch from 'node-fetch';
// For now, just log the intended API call

export function handleJiraWebhook(req: Request, res: Response) {
  const provided = req.headers['x-jira-secret'] || req.query.secret;
  if (!JIRA_SECRET || provided !== JIRA_SECRET) {
    return res.status(401).send('Unauthorized');
  }
  console.log('Received Jira webhook:', req.body);
  // TODO: Forward/transform to Teams webhook endpoint
  res.status(200).send('Received');
}

function getAuthHeaders() {
  const basic = Buffer.from(`${JIRA_USER}:${JIRA_TOKEN}`).toString('base64');
  return {
    'Authorization': `Basic ${basic}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function createIssue({ project, summary, priority, assignee, ac }: {
  project: string, summary: string, priority?: string, assignee?: string, ac?: string
}) {
  console.log("kjjhbhjb")
  const url = `${JIRA_BASE_URL}/rest/api/3/issue`;
  // Calculate due date: 3 days from now
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const body: any = {
    fields: {
      project: { key: project },
      summary,
      issuetype: { name: 'Task' },
      duedate: dueDate,
      customfield_10016: 1, // Story point estimate (set to 1 for now)
    },
  };
  if (priority) body.fields.priority = { name: priority };
  if (assignee) body.fields.assignee = { name: assignee.replace(/^@/, '') };
  if (ac) body.fields.description = ac;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('[Jira] createIssue response:', data);
    return data;
  } catch (err) {
    console.error('[Jira] createIssue error:', err);
    return { error: String(err) };
  }
}

export async function assignIssue({ issue, assignee }: { issue: string, assignee: string }) {
  const url = `${JIRA_BASE_URL}/rest/api/3/issue/${issue}/assignee`;
  const body = { name: assignee.replace(/^@/, '') };
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(JSON.stringify(data));
    }
    console.log('[Jira] assignIssue response:', res.status);
    return { status: res.status };
  } catch (err) {
    console.error('[Jira] assignIssue error:', err);
    return { error: String(err) };
  }
}

export async function transitionIssue({ issue, status }: { issue: string, status: string }) {
  // Need to get transition id for the status
  const transitionsUrl = `${JIRA_BASE_URL}/rest/api/3/issue/${issue}/transitions`;
  try {
    const transitionsRes = await fetch(transitionsUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const transitionsData = await transitionsRes.json();
    if (!transitionsRes.ok) throw new Error(JSON.stringify(transitionsData));
    const transition = (transitionsData.transitions || []).find((t: any) => t.name.toLowerCase() === status.toLowerCase());
    if (!transition) throw new Error(`No transition found for status '${status}'`);
    const doTransitionRes = await fetch(transitionsUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ transition: { id: transition.id } }),
    });
    if (!doTransitionRes.ok) {
      const data = await doTransitionRes.json();
      throw new Error(JSON.stringify(data));
    }
    console.log('[Jira] transitionIssue response:', doTransitionRes.status);
    return { status: doTransitionRes.status };
  } catch (err) {
    console.error('[Jira] transitionIssue error:', err);
    return { error: String(err) };
  }
}

export async function commentOnIssue({ issue, comment }: { issue: string, comment: string }) {
  const url = `${JIRA_BASE_URL}/rest/api/3/issue/${issue}/comment`;
  const body = { body: comment };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('[Jira] commentOnIssue response:', data);
    return data;
  } catch (err) {
    console.error('[Jira] commentOnIssue error:', err);
    return { error: String(err) };
  }
}

export async function getMyUpdates({ project, since, user }: { project: string, since: string, user?: string }) {
  // For MVP: fetch issues updated by the specified user (or current user) in the project since the given time
  // since: e.g. '-1d' (use JQL updated >= -1d)
  const assignee = user ? `"${user}"` : 'currentUser()';
  const jql = `project = ${project} AND updated >= ${since} AND assignee = ${assignee}`;
  const url = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('[Jira] getMyUpdates response:', data);
    return data;
  } catch (err) {
    console.error('[Jira] getMyUpdates error:', err);
    return { error: String(err) };
  }
}
