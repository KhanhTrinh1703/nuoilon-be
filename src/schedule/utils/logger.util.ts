import { promises as fs } from 'fs';
import { dirname, join } from 'path';

const logFilePath = join(process.cwd(), 'logs', 'fund-price-crawler.log');

export async function appendCrawlerLog(
  status: 'SUCCESS' | 'ERROR',
  message: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${status}] ${message}\n`;
  await ensureLogDirectory();
  await fs.appendFile(logFilePath, line, { encoding: 'utf8' });
}

async function ensureLogDirectory(): Promise<void> {
  const logDir = dirname(logFilePath);
  await fs.mkdir(logDir, { recursive: true });
}
