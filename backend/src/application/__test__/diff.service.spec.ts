import { DiffPart, DiffService } from '@application/services/diff.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('DiffService', () => {
  let service: DiffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiffService],
    }).compile();

    service = module.get<DiffService>(DiffService);
  });

  describe('diffText', () => {
    it('should return a single unchanged part for identical texts', () => {
      const parts = service.diffText('same text', 'same text');

      expect(parts).toEqual([
        { value: 'same text', added: false, removed: false },
      ]);
    });

    it('should flag added and removed parts', () => {
      const parts = service.diffText('React developer', 'Angular developer');

      expect(parts.some((p) => p.removed && p.value.includes('React'))).toBe(
        true,
      );
      expect(parts.some((p) => p.added && p.value.includes('Angular'))).toBe(
        true,
      );
    });

    it('should always return boolean flags, never undefined', () => {
      const parts = service.diffText('a b', 'a c');

      for (const p of parts) {
        expect(typeof p.added).toBe('boolean');
        expect(typeof p.removed).toBe('boolean');
      }
    });

    it('should diff by lines when mode is lines', () => {
      const parts = service.diffText('one\ntwo\n', 'one\nthree\n', 'lines');

      expect(parts.some((p) => p.removed && p.value === 'two\n')).toBe(true);
      expect(parts.some((p) => p.added && p.value === 'three\n')).toBe(true);
    });

    it('should fall back to words for an unknown mode', () => {
      const parts = service.diffText('a b', 'a c', 'unknown' as never);

      expect(parts.some((p) => p.added)).toBe(true);
      expect(parts.some((p) => p.removed)).toBe(true);
    });

    it('should treat null or undefined inputs as empty strings', () => {
      const parts = service.diffText(null as never, 'novo texto');

      expect(parts).toEqual([
        { value: 'novo texto', added: true, removed: false },
      ]);
    });
  });

  describe('summarize', () => {
    it('should sum the length of added and removed values', () => {
      const parts: DiffPart[] = [
        { value: 'comum ', added: false, removed: false },
        { value: 'velho', added: false, removed: true },
        { value: 'novissimo', added: true, removed: false },
      ];

      expect(service.summarize(parts)).toEqual({ added: 9, removed: 5 });
    });

    it('should return zeros when there are no changes', () => {
      const parts = service.diffText('igual', 'igual');

      expect(service.summarize(parts)).toEqual({ added: 0, removed: 0 });
    });

    it('should return zeros for an empty parts list', () => {
      expect(service.summarize([])).toEqual({ added: 0, removed: 0 });
    });
  });
});
