// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import type { Job } from '@/domain/job';
import { summarizeJobs } from './BatchProgress';

function job(status: Job['status']): Job {
  return {
    id: status,
    batchId: 'batch',
    bookId: 'book',
    kind: 'illustration',
    target: { kind: 'story', pageId: 'page' },
    overwrite: false,
    dependsOnJobId: null,
    status,
    step: 'pending',
    attempts: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('summarizeJobs', () => {
  it('distinguishes finished work from failures, cancellation, running, and waiting', () => {
    expect(
      summarizeJobs([
        job('succeeded'),
        job('failed'),
        job('cancelled'),
        job('running'),
        job('queued'),
        job('paused'),
      ]),
    ).toEqual({
      total: 6,
      done: 1,
      failed: 1,
      cancelled: 1,
      working: 1,
      waiting: 2,
      finished: 3,
    });
  });
});
