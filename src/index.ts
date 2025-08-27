import express from 'express';
import helmet from 'helmet';
import { PORT } from './env';
import { handleTeamsWebhook } from './teams';
import { handleJiraWebhook } from './jira';

const app = express();
app.use(helmet());
app.use(express.json());

app.get('/', (_req, res) => res.send('<h1>JT-Agent is live!</h1><p>Teams ↔ Jira bridge is running.</p>'));
app.get('/health', (_req, res) => res.send('OK'));

app.post('/webhook/teams', handleTeamsWebhook);
app.post('/webhook/jira', handleJiraWebhook);

app.listen(PORT, () => {
  console.log(`Bridge listening on port ${PORT}`);
});
