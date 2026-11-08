import { HttpException, HttpStatus } from '@nestjs/common';
import { AnalysisService } from '@application/services/analysis.service';

describe('AnalysisService daily quota', () => {
  const count = jest.fn();
  const analyze = jest.fn();
  const create = jest.fn();
  let service: AnalysisService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-04T15:30:00Z'));
    delete process.env.ANALYSIS_DAILY_LIMIT;
    count.mockReset();
    analyze.mockReset().mockResolvedValue({});
    create.mockReset().mockResolvedValue({ id: 'a1', atsScore: 80 });

    service = new AnalysisService(
      { countByUserSince: count, create } as any,
      {
        findByIdAndUserId: jest
          .fn()
          .mockResolvedValue({ id: 'r1', currentVersionId: 'v1' }),
      } as any,
      {
        findByIdAndResumeId: jest
          .fn()
          .mockResolvedValue({ id: 'v1', rawText: 'text' }),
        update: jest.fn(),
      } as any,
      { createAnalysisEntity: jest.fn().mockReturnValue({}) } as any,
      { analyze } as any,
      { logger: jest.fn() } as any,
    );
    (service as any).resumeRepository.findByIdAndUserId = jest
      .fn()
      .mockResolvedValue({ id: 'r1', currentVersionId: 'v1' });
  });

  afterEach(() => jest.useRealTimers());

  it('blocks with 429 when the limit is reached, before calling the model', async () => {
    count.mockResolvedValue(20);

    const error = await service.analyzeResume('r1', 'u1').catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('counts running analyses, so parallel requests cannot pass the limit', async () => {
    process.env.ANALYSIS_DAILY_LIMIT = '1';
    count.mockResolvedValue(0);
    let finish!: (value: unknown) => void;
    analyze.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const first = service.analyzeResume('r1', 'u1');
    const second = await service.analyzeResume('r1', 'u1').catch((e) => e);

    expect(second).toBeInstanceOf(HttpException);
    expect(second.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(analyze).toHaveBeenCalledTimes(1);

    finish({});
    await first;

    // the slot is free again once the first run is done
    count.mockResolvedValue(0);
    await expect(service.analyzeResume('r1', 'u1')).resolves.toBeDefined();
  });

  it('allows when below the limit', async () => {
    count.mockResolvedValue(19);

    await expect(service.analyzeResume('r1', 'u1')).resolves.toBeDefined();
    expect(analyze).toHaveBeenCalled();
  });

  it('honors ANALYSIS_DAILY_LIMIT', async () => {
    process.env.ANALYSIS_DAILY_LIMIT = '2';
    count.mockResolvedValue(2);

    await expect(service.analyzeResume('r1', 'u1')).rejects.toThrow(
      'Daily analysis limit of 2',
    );
  });

  it('counts from the start of the current UTC day, so the next day restarts', async () => {
    count.mockResolvedValue(0);
    await service.analyzeResume('r1', 'u1');
    expect(count).toHaveBeenLastCalledWith(
      'u1',
      new Date('2026-11-04T00:00:00.000Z'),
    );

    jest.setSystemTime(new Date('2026-11-05T00:10:00Z'));
    await service.analyzeResume('r1', 'u1');
    expect(count).toHaveBeenLastCalledWith(
      'u1',
      new Date('2026-11-05T00:00:00.000Z'),
    );
  });
});
