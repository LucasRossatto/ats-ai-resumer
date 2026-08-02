import { AnalysisStat } from '@domain/entities/Analysis';
import { Resume } from '@domain/entities/Resume';
import { ResumeVersion } from '@domain/entities/ResumeVersion';
import { HistoryDomainService } from '@domain/services/history-domain.service';

describe('HistoryDomainService', () => {
  let service: HistoryDomainService;

  const resumes = [
    {
      id: 'resume-1',
      title: 'Backend CV',
      createdAt: new Date('2026-01-01T09:00:00Z'),
    },
    {
      id: 'resume-2',
      title: 'Data CV',
      createdAt: new Date('2026-01-02T09:00:00Z'),
    },
  ] as Resume[];

  const versions = [
    {
      id: 'version-1',
      resumeId: 'resume-1',
      versionNumber: 1,
      label: 'V1',
      sourceType: 'upload',
      createdAt: new Date('2026-01-01T09:00:00Z'),
    },
    {
      id: 'version-2',
      resumeId: 'resume-1',
      versionNumber: 2,
      label: 'V2',
      sourceType: 'rewrite',
      createdAt: new Date('2026-01-05T09:00:00Z'),
    },
  ] as ResumeVersion[];

  const analyses = [
    {
      id: 'analysis-1',
      resumeId: 'resume-1',
      versionId: 'version-1',
      atsScore: 58,
      createdAt: new Date('2026-01-03T09:00:00Z'),
    },
  ] as AnalysisStat[];

  beforeEach(() => {
    service = new HistoryDomainService();
  });

  describe('buildEvents', () => {
    it('merges uploads, rewrites and analyses into one timeline', () => {
      const events = service.buildEvents(resumes, versions, analyses);

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.type)).toEqual([
        'rewrite',
        'analyze',
        'upload',
        'upload',
      ]);
    });

    it('orders the timeline newest first', () => {
      const events = service.buildEvents(resumes, versions, analyses);

      expect(events.map((event) => event.id)).toEqual([
        'v-version-2',
        'a-analysis-1',
        'r-resume-2',
        'r-resume-1',
      ]);
    });

    it('derives the upload event from the resume, not from its first version', () => {
      const events = service.buildEvents(resumes, versions, analyses);
      const uploads = events.filter((event) => event.type === 'upload');

      expect(uploads).toHaveLength(2);
      expect(uploads.some((event) => event.id === 'v-version-1')).toBe(false);
      expect(uploads[1]).toEqual({
        id: 'r-resume-1',
        type: 'upload',
        title: 'Backend CV uploaded',
        subtitle: 'Parsed and version V1 created',
        label: 'V1',
        at: new Date('2026-01-01T09:00:00Z'),
        resumeId: 'resume-1',
        resumeTitle: 'Backend CV',
      });
    });

    it('describes a rewrite with the version it created', () => {
      const events = service.buildEvents(resumes, versions, analyses);

      expect(events[0]).toEqual({
        id: 'v-version-2',
        type: 'rewrite',
        title: 'V2 created for Backend CV',
        subtitle: 'Rewrites applied to previous version',
        label: 'V2 created',
        at: new Date('2026-01-05T09:00:00Z'),
        resumeId: 'resume-1',
        resumeTitle: 'Backend CV',
      });
    });

    it('describes an analysis with the score it reached', () => {
      const events = service.buildEvents(resumes, versions, analyses);

      expect(events[1]).toEqual({
        id: 'a-analysis-1',
        type: 'analyze',
        title: 'Analysis complete on Backend CV',
        subtitle: 'ATS score 58 / 100',
        label: '58',
        at: new Date('2026-01-03T09:00:00Z'),
        resumeId: 'resume-1',
        resumeTitle: 'Backend CV',
      });
    });

    it('falls back to a generic title when the resume is out of reach', () => {
      const events = service.buildEvents([], versions, analyses);

      expect(events.map((event) => event.title)).toEqual([
        'V2 created for resume',
        'Analysis complete on resume',
      ]);
      expect(events.every((event) => event.resumeTitle === 'Resume')).toBe(
        true,
      );
    });

    it('sinks an event with no timestamp to the bottom', () => {
      const undated = [
        { ...analyses[0], id: 'analysis-2', createdAt: undefined },
      ] as AnalysisStat[];

      const events = service.buildEvents(resumes, [], undated);

      expect(events[events.length - 1].id).toBe('a-analysis-2');
    });

    it('returns nothing for a user with no activity', () => {
      expect(service.buildEvents([], [], [])).toEqual([]);
    });
  });

  describe('buildTotals', () => {
    it('splits the timeline per event type', () => {
      const events = service.buildEvents(resumes, versions, analyses);

      expect(service.buildTotals(events)).toEqual({
        all: 4,
        upload: 2,
        analyze: 1,
        rewrite: 1,
      });
    });

    it('reports zeros for an empty timeline', () => {
      expect(service.buildTotals([])).toEqual({
        all: 0,
        upload: 0,
        analyze: 0,
        rewrite: 0,
      });
    });
  });
});
