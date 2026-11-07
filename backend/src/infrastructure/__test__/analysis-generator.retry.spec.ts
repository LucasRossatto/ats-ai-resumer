import { ServiceUnavailableException } from '@nestjs/common';
import {
  AnalysisGeneratorService,
  ai,
} from '@infrastructure/ai/analysis-generator.service';

import { AnalysisLanguage } from '@domain/entities/AnalysisLanguage';

const logger = { logger: jest.fn(), warning: jest.fn(), err: jest.fn() };
const input = {
  rawText: 'Maria, desenvolvedora',
  language: AnalysisLanguage.PT_BR,
};
const okResponse = {
  text: JSON.stringify({ atsScore: 70, issues: [], strengths: [] }),
  usageMetadata: { promptTokenCount: 10 },
};

describe('AnalysisGeneratorService retry', () => {
  let generate: jest.SpyInstance;
  let service: AnalysisGeneratorService;

  beforeEach(() => {
    jest.useFakeTimers();
    generate = jest.spyOn(ai.models, 'generateContent');
    service = new AnalysisGeneratorService(logger as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('waits before the second attempt instead of retrying immediately', async () => {
    generate
      .mockRejectedValueOnce(new Error('503 high demand'))
      .mockResolvedValueOnce(okResponse as never);

    const promise = service.analyze(input);
    await jest.advanceTimersByTimeAsync(0);
    expect(generate).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.atsScore).toBe(70);
  });

  it('caps output tokens and sets a timeout signal', async () => {
    generate.mockResolvedValue(okResponse as never);

    await service.analyze(input);

    const { config } = generate.mock.calls[0][0];
    expect(config.maxOutputTokens).toBeGreaterThan(0);
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('gives up with a 503 after the second failure', async () => {
    generate.mockRejectedValue(new Error('503 high demand'));

    const promise = service.analyze(input);
    const assertion = expect(promise).rejects.toThrow(
      ServiceUnavailableException,
    );
    await jest.advanceTimersByTimeAsync(2000);
    await assertion;

    expect(generate).toHaveBeenCalledTimes(2);
  });
});
