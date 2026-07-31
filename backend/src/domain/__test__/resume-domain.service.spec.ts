import { ResumeDomainService } from '@domain/services/resume-domain.service';

describe('ResumeDomainService', () => {
  let service: ResumeDomainService;

  beforeEach(() => {
    service = new ResumeDomainService();
  });

  describe('resolveTitle', () => {
    it('prefers the provided title', () => {
      expect(service.resolveTitle('  Backend CV  ', 'lucas.pdf')).toBe(
        'Backend CV',
      );
    });

    it('falls back to the file name without the pdf extension', () => {
      expect(service.resolveTitle(undefined, 'Lucas Rossatto CV.PDF')).toBe(
        'Lucas Rossatto CV',
      );
    });

    it('falls back to a generic title when both are empty', () => {
      expect(service.resolveTitle('   ', '.pdf')).toBe('Untitled Resume');
    });

    it('truncates to the 120 character limit of the schema', () => {
      const title = service.resolveTitle('a'.repeat(200), 'cv.pdf');
      expect(title).toHaveLength(120);
    });
  });

  describe('id generation', () => {
    it('prefixes ids like the other entities do', () => {
      expect(service.generateResumeId()).toMatch(/^resume-[0-9a-f-]{36}$/);
      expect(service.generateVersionId()).toMatch(/^version-[0-9a-f-]{36}$/);
    });

    it('never repeats an id', () => {
      expect(service.generateResumeId()).not.toBe(service.generateResumeId());
    });
  });

  describe('createFirstVersionEntity', () => {
    it('always produces V1 with no parent', () => {
      const version = service.createFirstVersionEntity('resume-1', 'text', {
        summary: 'hi',
      });

      expect(version).toMatchObject({
        resumeId: 'resume-1',
        versionNumber: 1,
        label: 'V1',
        rawText: 'text',
        sourceType: 'upload',
        parentVersionId: null,
      });
    });
  });

  describe('createResumeEntity', () => {
    it('starts with no current version and version count 1', () => {
      const resume = service.createResumeEntity('auth-1', 'My CV');

      expect(resume).toMatchObject({
        userId: 'auth-1',
        title: 'My CV',
        currentVersionId: null,
        latestVersionNumber: 1,
      });
    });
  });
});
