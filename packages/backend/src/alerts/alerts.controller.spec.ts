import { Test } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { BadRequestException } from '@nestjs/common';

describe('AlertsController GET /alerts', () => {
  let controller: AlertsController;
  let service: Partial<Record<keyof AlertsService, jest.Mock>>;

  beforeEach(async () => {
    service = {
      findByDevice: jest.fn().mockResolvedValue([
        { id: 'a1', parcelId: 'p1', deviceId: 'd1', severity: 4, condition: 'helada', createdAt: '2026-07-23T10:00:00.000Z' },
        { id: 'a2', parcelId: 'p1', deviceId: 'd1', severity: 3, condition: 'estres-hidrico', createdAt: '2026-07-22T08:00:00.000Z' },
      ]),
      findByParcel: jest.fn().mockResolvedValue([
        { id: 'a1', parcelId: 'p1', deviceId: 'd1', severity: 4, condition: 'helada', createdAt: '2026-07-23T10:00:00.000Z' },
      ]),
      generate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [{ provide: AlertsService, useValue: service }],
    }).compile();

    controller = module.get(AlertsController);
  });

  it('returns alerts by deviceId using AP4', async () => {
    const result = await controller.list('d1', undefined);
    expect(service.findByDevice).toHaveBeenCalledWith('d1');
    expect(result).toHaveLength(2);
  });

  it('returns alerts by parcelId using AP3', async () => {
    const result = await controller.list(undefined, 'p1');
    expect(service.findByParcel).toHaveBeenCalledWith('p1');
    expect(result).toHaveLength(1);
  });

  it('throws BadRequest when no query param provided', async () => {
    await expect(controller.list(undefined, undefined))
      .rejects.toThrow(BadRequestException);
  });

  it('prefers deviceId when both params provided', async () => {
    await controller.list('d1', 'p1');
    expect(service.findByDevice).toHaveBeenCalledWith('d1');
    expect(service.findByParcel).not.toHaveBeenCalled();
  });
});
