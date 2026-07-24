import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

describe('PushController', () => {
  let controller: PushController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      getPublicKey: jest.fn().mockResolvedValue('BNxQ...fake-key'),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      controllers: [PushController],
      providers: [{ provide: PushService, useValue: service }],
    }).compile();
    controller = module.get(PushController);
  });

  it('GET /push/public-key returns the VAPID public key', async () => {
    const res = await controller.getPublicKey();
    expect(res.publicKey).toBe('BNxQ...fake-key');
  });

  it('POST /push/subscribe validates and persists', async () => {
    const body = {
      deviceId: '00000000-0000-4000-8000-000000000001',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'key1', auth: 'key2' },
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const res = await controller.subscribe(body);
    expect(res.subscribed).toBe(true);
    expect(service.subscribe).toHaveBeenCalledWith(body);
  });

  it('POST /push/subscribe rejects invalid body', async () => {
    await expect(controller.subscribe({ bad: true })).rejects.toThrow(BadRequestException);
  });

  it('DELETE /push/unsubscribe removes subscription', async () => {
    const body = {
      deviceId: '00000000-0000-4000-8000-000000000001',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    };
    const res = await controller.unsubscribe(body);
    expect(res.unsubscribed).toBe(true);
    expect(service.unsubscribe).toHaveBeenCalledWith(body.deviceId, body.endpoint);
  });
});
