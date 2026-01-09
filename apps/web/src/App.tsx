import { logger } from '@repo/logs';

export default function App() {
  logger.info('App loaded');

  return (
    <div>
      <h1>FlowStack</h1>
      <p>Welcome to your monorepo</p>
    </div>
  );
}
