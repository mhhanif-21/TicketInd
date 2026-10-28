'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/admin/api';
import type {
  AdminExportStatusResponse,
  AdminExportTriggerResponse,
} from '@/lib/admin/types';

const EXPORT_POLL_INTERVAL_MS = 3_000;
const EXPORT_MAX_POLLS = 15;

export type ParticipantExportPhase =
  | 'idle'
  | 'starting'
  | 'polling'
  | 'ready'
  | 'timeout'
  | 'failed';

interface ParticipantExportState {
  phase: ParticipantExportPhase;
  message: string | null;
  jobId: string | null;
  fileUrl: string | null;
}

const initialState: ParticipantExportState = {
  phase: 'idle',
  message: null,
  jobId: null,
  fileUrl: null,
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Triggers the server-side CSV export and polls the durable job. The download
 * URL is only opened by an explicit user action because browsers block popups
 * that are opened after a long asynchronous wait.
 */
export function useParticipantExport(eventId: string) {
  const [state, setState] = useState<ParticipantExportState>(initialState);
  const runToken = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    runToken.current += 1;
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  function waitForNextPoll(): Promise<void> {
    return new Promise((resolve) => {
      pollTimer.current = setTimeout(resolve, EXPORT_POLL_INTERVAL_MS);
    });
  }

  async function pollJob(jobId: string, token: number) {
    for (let attempt = 0; attempt < EXPORT_MAX_POLLS; attempt += 1) {
      await waitForNextPoll();
      if (token !== runToken.current) return;

      try {
        const response = await adminFetch<AdminExportStatusResponse>(
          `/api/v1/exports/${jobId}`,
        );
        if (token !== runToken.current) return;

        const job = response.data;
        if (job.status === 'completed') {
          if (!job.file_url) {
            setState({
              phase: 'failed',
              message: 'The export completed but its download link is not available. Try exporting again.',
              jobId,
              fileUrl: null,
            });
            return;
          }

          setState({
            phase: 'ready',
            message: 'Export ready. The download link is valid for 5 minutes.',
            jobId,
            fileUrl: job.file_url,
          });
          return;
        }

        if (job.status === 'failed') {
          setState({
            phase: 'failed',
            message: job.error
              ? `Export failed: ${job.error}`
              : 'The export failed on the server. Please try again.',
            jobId,
            fileUrl: null,
          });
          return;
        }
      } catch (error) {
        if (token !== runToken.current) return;
        setState({
          phase: 'failed',
          message: errorMessage(error, 'The export status could not be checked. Please try again.'),
          jobId,
          fileUrl: null,
        });
        return;
      }
    }

    if (token === runToken.current) {
      setState({
        phase: 'timeout',
        message: 'The export is taking longer than expected. It may still be processing in the background.',
        jobId,
        fileUrl: null,
      });
    }
  }

  async function start() {
    const token = runToken.current + 1;
    runToken.current = token;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setState({
      phase: 'starting',
      message: 'Starting the participant export…',
      jobId: null,
      fileUrl: null,
    });

    try {
      const response = await adminFetch<AdminExportTriggerResponse>(
        `/api/v1/events/${eventId}/export`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      if (token !== runToken.current) return;

      const jobId = response.data?.job_id;
      if (!jobId) throw new Error('The export job ID was not returned.');

      setState({
        phase: 'polling',
        message: 'Preparing the export file. This can take up to a minute.',
        jobId,
        fileUrl: null,
      });
      await pollJob(jobId, token);
    } catch (error) {
      if (token !== runToken.current) return;
      setState({
        phase: 'failed',
        message: errorMessage(error, 'The export could not be started. Please try again.'),
        jobId: null,
        fileUrl: null,
      });
    }
  }

  async function checkAgain() {
    if (!state.jobId) {
      await start();
      return;
    }

    const token = runToken.current + 1;
    runToken.current = token;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setState((current) => ({
      ...current,
      phase: 'polling',
      message: 'Checking the export status again…',
      fileUrl: null,
    }));
    await pollJob(state.jobId, token);
  }

  function reset() {
    runToken.current += 1;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setState(initialState);
  }

  return {
    ...state,
    isBusy: state.phase === 'starting' || state.phase === 'polling',
    start,
    checkAgain,
    reset,
  };
}
