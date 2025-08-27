import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const JIRA_BASE_URL = process.env.JIRA_BASE_URL || '';
export const JIRA_USER = process.env.JIRA_USER || '';
export const JIRA_TOKEN = process.env.JIRA_TOKEN || '';
export const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || '';
export const JIRA_SECRET = process.env.JIRA_SECRET || '';
