import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let service: { processAll: jest.Mock };

  beforeEach(async () => {
    service = {
      processAll: jest.fn().mockResolvedValue([
        { id: 'op1', status: 'synced' },
        { id: 'op2', status: 'failed', error: 'something' },
      ]),
    };
    const module = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: service }],
    }).compile();
    controller = module.get(SyncController);
  });

  it('dispatches valid operations and returns per-op status', async () => {
    const ops = [
      { id: '00000000-0000-4000-8000-000000000010', deviceId: '00000000-0000-4000-8000-000000000001', type: 'create-parcel', payload: { name: 'L1', crop: 'soja', stage: 'floracion', hectares: 10, coordinates: { lat: -24, lon: -65 }, deviceId: '00000000-0000-4000-8000-000000000001' }, createdAt: '2026-01-01T00:00:00.000Z', status: 'pending', retries: 0 },
      { id: '00000000-0000-4000-8000-000000000011', deviceId: '00000000-0000-4000-8000-000000000001', type: 'alert-delivered', payload: { alertId: '00000000-0000-4000-8000-000000000002', deliveredAt: '2026-01-01T01:00:00.000Z' }, createdAt: '2026-01-01T00:00:00.000Z', status: 'pending', retries: 0 },
    ];
    const result = await controller.sync(ops);
    expect(service.processAll).toHaveBeenCalledWith(ops);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('synced');
    expect(result[1].status).toBe('failed');
  });

  it('rejects empty array', async () => {
    await expect(controller.sync([])).rejects.toThrow(BadRequestException);
  });

  it('rejects array > 50', async () => {
    const ops = Array.from({ length: 51 }, (_, i) => ({
      id: `op${i}`, deviceId: '00000000-0000-4000-8000-000000000001',
      type: 'create-parcel', payload: { name: 'L', crop: 'soja', stage: 'siembra', hectares: 1, coordinates: { lat: -24, lon: -65 }, deviceId: '00000000-0000-4000-8000-000000000001' },
      createdAt: '2026-01-01T00:00:00.000Z', status: 'pending', retries: 0,
    }));
    await expect(controller.sync(ops)).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid payload', async () => {
    await expect(controller.sync([{ bad: true }])).rejects.toThrow(BadRequestException);
  });
});
