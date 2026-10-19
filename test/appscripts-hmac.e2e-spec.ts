import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import * as crypto from 'crypto';
import { AppscriptsController } from '../src/appscripts/appscripts.controller';
import { AppscriptsService } from '../src/appscripts/appscripts.service';

const SECRET = 'test-secret';
const PATH = '/api/v1/appscripts/deposit-transaction';
const BODY = {
  transactionDate: '2024-01-15T00:00:00.000Z',
  capital: 5000000,
  transactionId: 'DEP-2024-001',
};

// Mirrors HmacSignatureGuard: METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY
function sign(timestamp: string, body: object, secret = SECRET): string {
  const stringToSign = ['POST', PATH, '', timestamp, JSON.stringify(body)].join(
    '\n',
  );
  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

describe('AppScripts HMAC guard (e2e)', () => {
  let app: INestApplication<App>;
  const service = {
    upsertDepositTransaction: jest.fn().mockResolvedValue({ ok: true }),
    upsertCertificateTransaction: jest.fn(),
    upsertExcelTransaction: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppscriptsController],
      providers: [
        { provide: AppscriptsService, useValue: service },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'security.activeSecret' ? SECRET : undefined,
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same routing setup as main.ts so the signed path matches production
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    service.upsertDepositTransaction.mockClear();
  });

  it('accepts a correctly signed request', async () => {
    const timestamp = Date.now().toString();

    await request(app.getHttpServer())
      .post(PATH)
      .set('X-Timestamp', timestamp)
      .set('X-Signature', sign(timestamp, BODY))
      .send(BODY)
      .expect(201)
      .expect({ ok: true });

    expect(service.upsertDepositTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a request without signature headers', async () => {
    await request(app.getHttpServer()).post(PATH).send(BODY).expect(401);

    expect(service.upsertDepositTransaction).not.toHaveBeenCalled();
  });

  it('rejects a request signed with the wrong secret', async () => {
    const timestamp = Date.now().toString();

    await request(app.getHttpServer())
      .post(PATH)
      .set('X-Timestamp', timestamp)
      .set('X-Signature', sign(timestamp, BODY, 'wrong-secret'))
      .send(BODY)
      .expect(401);

    expect(service.upsertDepositTransaction).not.toHaveBeenCalled();
  });

  it('rejects a request whose body was tampered with after signing', async () => {
    const timestamp = Date.now().toString();

    await request(app.getHttpServer())
      .post(PATH)
      .set('X-Timestamp', timestamp)
      .set('X-Signature', sign(timestamp, BODY))
      .send({ ...BODY, capital: 999999999 })
      .expect(401);

    expect(service.upsertDepositTransaction).not.toHaveBeenCalled();
  });

  it('rejects a request with a timestamp outside the 5 minute window', async () => {
    const timestamp = (Date.now() - 6 * 60 * 1000).toString();

    await request(app.getHttpServer())
      .post(PATH)
      .set('X-Timestamp', timestamp)
      .set('X-Signature', sign(timestamp, BODY))
      .send(BODY)
      .expect(401);

    expect(service.upsertDepositTransaction).not.toHaveBeenCalled();
  });
});
