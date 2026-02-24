import { Router, Request, Response } from 'express';
import packageJson from '../../package.json';

const router = Router();

function getVersion(): string {
  const configuredVersion = process.env.APP_VERSION?.trim();
  if (configuredVersion) {
    return configuredVersion;
  }
  return packageJson.version;
}

function getBuild(): string {
  const configuredBuild = process.env.APP_BUILD?.trim();
  if (configuredBuild) {
    return configuredBuild;
  }
  return '';
}

function getCommit(): string {
  const configuredCommit = process.env.APP_COMMIT?.trim();
  if (configuredCommit) {
    return configuredCommit;
  }
  return '';
}

router.get('/meta/version', (_req: Request, res: Response) => {
  const build = getBuild();
  const commit = getCommit();
  const response: { version: string; build?: string; commit?: string } = {
    version: getVersion(),
  };

  if (build) {
    response.build = build;
  }
  if (commit) {
    response.commit = commit;
  }

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=300');
  res.status(200).json(response);
});

export default router;
