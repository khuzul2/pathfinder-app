import { createApp } from './app';
import { config } from './config';

// Cloud Run injects PORT — always bind to it (config coerces/defaults to 8080).
const app = createApp();

app.listen(config.port, () => {
  console.log(`Pathfinder gateway listening on :${config.port} (${config.nodeEnv})`);
});
