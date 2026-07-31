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

  describe('createRewriteVersionEntity', () => {
    it('links the new version to the one it was rewritten from', () => {
      const version = service.createRewriteVersionEntity(
        'resume-1',
        2,
        'new text',
        { summary: 'parsed' },
        'version-1',
      );

      expect(version).toMatchObject({
        resumeId: 'resume-1',
        versionNumber: 2,
        label: 'V2',
        rawText: 'new text',
        sourceType: 'rewrite',
        parentVersionId: 'version-1',
        latestAnalysisId: null,
      });
    });
  });

  describe('applyRewritesToText', () => {
    it('swaps each original bullet for its rewritten version', () => {
      const result = service.applyRewritesToText(
        'Worked on the API\nHelped the team',
        [
          { original: 'Worked on the API', rewritten: 'Shipped 12 endpoints' },
          { original: 'Helped the team', rewritten: 'Led 4 engineers' },
        ],
      );

      expect(result).toBe('Shipped 12 endpoints\nLed 4 engineers');
    });

    it('swaps only the first occurrence of a repeated bullet', () => {
      const result = service.applyRewritesToText('same\nsame', [
        { original: 'same', rewritten: 'better' },
      ]);

      expect(result).toBe('better\nsame');
    });

    it('appends the rewrite as an extra line when the original is gone', () => {
      const result = service.applyRewritesToText('unrelated text', [
        { original: 'missing bullet', rewritten: 'Shipped 12 endpoints' },
      ]);

      expect(result).toBe('unrelated text\nShipped 12 endpoints');
    });

    it('skips rewrites missing either side of the swap', () => {
      const result = service.applyRewritesToText('text', [
        { original: '', rewritten: 'ignored' },
        { original: 'text', rewritten: '' },
      ]);

      expect(result).toBe('text');
    });
  });

  describe('patchBulletsInSections', () => {
    it('swaps the bullets inside experience, summary and projects', () => {
      const patched = service.patchBulletsInSections(
        {
          summary: 'Worked on the API daily',
          experience: [
            { company: 'Acme', bullets: ['Helped the team', 'Untouched'] },
          ],
          projects: [{ name: 'Bot', description: 'Worked on the API' }],
        },
        [
          { original: 'Worked on the API', rewritten: 'Shipped 12 endpoints' },
          { original: 'Helped the team', rewritten: 'Led 4 engineers' },
        ],
      );

      expect(patched.summary).toBe('Shipped 12 endpoints daily');
      expect(patched.experience[0].bullets).toEqual([
        'Led 4 engineers',
        'Untouched',
      ]);
      expect(patched.projects[0].description).toBe('Shipped 12 endpoints');
      expect(patched.experience[0].company).toBe('Acme');
    });

    it('does not add sections the base version did not have', () => {
      const patched = service.patchBulletsInSections({ skills: ['Node'] }, []);

      expect(patched.experience).toBeUndefined();
      expect(patched.projects).toBeUndefined();
      expect(patched.skills).toEqual(['Node']);
    });
  });

  describe('looksEmpty', () => {
    it('is true for undefined sections', () => {
      expect(service.looksEmpty(undefined)).toBe(true);
    });

    it('is true when there is neither identity nor body', () => {
      expect(
        service.looksEmpty({
          basics: { name: '', email: '', title: '' },
          summary: '',
          experience: [],
          education: [],
          skills: [],
        }),
      ).toBe(true);
    });

    it('is false when only the identity is present', () => {
      expect(service.looksEmpty({ basics: { name: 'Lucas' } })).toBe(false);
    });

    it('is false when only the body is present', () => {
      expect(service.looksEmpty({ skills: ['Node'] })).toBe(false);
    });
  });
});
