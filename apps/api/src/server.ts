import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[TransCode Lab API] Listening on port ${config.port} (env: ${config.nodeEnv})`);
  console.log(`[TransCode Lab API] Database: ${config.databasePath}`);
  console.log(`[TransCode Lab API] Model Service URL: ${config.modelServiceUrl}`);
  console.log(`[TransCode Lab API] Execution Runner URL: ${config.executionRunnerUrl}`);
});

