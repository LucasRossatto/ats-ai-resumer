import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';
import { VersionsDomainService } from '@domain/services/versions-domain.service';

describe('VersionsDomainService', () => {
  let service: VersionsDomainService;

  const resumes = [
    { id: 'resume-1', title: 'Backend CV' },
    { id: 'resume-2', title: 'Data CV' },
  ] as Resume[];

  const versions = [
    {
      id: 'version-3',
      resumeId: 'resume-2',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      parentVersionId: null,
      latestAnalysisId: 'analysis-3',
      createdAt: new Date('2026-01-04T10:00:00Z'),
    },
    {
      id: 'version-2',
      resumeId: 'resume-1',
      versionNumber: 2,
      label: 'V2',
      sourceType: 'rewrite',
      parentVersionId: 'version-1',
      latestAnalysisId: 'analysis-2',
      createdAt: new Date('2026-01-03T10:00:00Z'),
    },
    {
      id: 'version-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      parentVersionId: null,
      latestAnalysisId: null,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
  ] as ResumeVersion[];

  const scoreByVersionId = new Map([
    ['version-2', 82],
    ['version-3', 66],
  ]);

  beforeEach(() => {
    service = new VersionsDomainService();
  });

  describe('buildItems', () => {
    it('joins each version to its resume title and score', () => {
      const items = service.buildItems(versions, resumes, scoreByVersionId);

      expect(items).toEqual([
        {
          id: 'version-3',
          label: 'V1',
          versionNumber: 1,
          sourceType: 'upload',
          createdAt: new Date('2026-01-04T10:00:00Z'),
          score: 66,
          resumeId: 'resume-2',
          resumeTitle: 'Data CV',
          parentVersionId: null,
        },
        {
          id: 'version-2',
          label: 'V2',
          versionNumber: 2,
          sourceType: 'rewrite',
          createdAt: new Date('2026-01-03T10:00:00Z'),
          score: 82,
          resumeId: 'resume-1',
          resumeTitle: 'Backend CV',
          parentVersionId: 'version-1',
        },
        {
          id: 'version-1',
          label: 'V1',
          versionNumber: 1,
          sourceType: 'upload',
          createdAt: new Date('2026-01-01T10:00:00Z'),
          score: null,
          resumeId: 'resume-1',
          resumeTitle: 'Backend CV',
          parentVersionId: null,
        },
      ]);
    });

    it('scores an unanalyzed version as null instead of zero', () => {
      const items = service.buildItems(versions, resumes, scoreByVersionId);

      expect(items.find((item) => item.id === 'version-1').score).toBeNull();
    });

    it('keeps the order the repository answered in', () => {
      const items = service.buildItems(versions, resumes, scoreByVersionId);

      expect(items.map((item) => item.id)).toEqual([
        'version-3',
        'version-2',
        'version-1',
      ]);
    });

    it('falls back to a generic title when the resume is out of reach', () => {
      const items = service.buildItems(versions, [], scoreByVersionId);

      expect(items).toHaveLength(3);
      expect(items.every((item) => item.resumeTitle === 'Resume')).toBe(true);
    });

    it('returns nothing for a user with no versions', () => {
      expect(service.buildItems([], resumes, new Map())).toEqual([]);
    });
  });

  describe('buildTotals', () => {
    it('splits the list per source type', () => {
      const items = service.buildItems(versions, resumes, scoreByVersionId);

      expect(service.buildTotals(items)).toEqual({
        all: 3,
        uploads: 2,
        rewrites: 1,
      });
    });

    it('reports zeros for an empty list', () => {
      expect(service.buildTotals([])).toEqual({
        all: 0,
        uploads: 0,
        rewrites: 0,
      });
    });
  });
});
