'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/admin/format';

export function WizardStepper({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <div>
          <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-secondary">
            Step {current + 1} of {steps.length}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-on-surface">{steps[current]}</p>
        </div>
        <div className="flex w-28 gap-1" aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={step}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                index <= current ? 'bg-primary' : 'bg-surface-container-high',
              )}
            />
          ))}
        </div>
      </div>

      <ol className="hidden items-center gap-2 sm:flex" aria-label="Create event steps">
        {steps.map((step, index) => {
          const completed = index < current;
          const active = index === current;
          const clickable = index < current;

          return (
            <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (clickable) onStepClick(index);
                }}
                disabled={!clickable}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                  clickable && 'hover:bg-surface-container',
                  !clickable && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                    active && 'border-primary bg-primary text-on-primary',
                    completed && 'border-primary bg-primary text-on-primary',
                    !active && !completed && 'border-outline-variant bg-surface-container-lowest text-secondary',
                  )}
                >
                  {completed ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-xs font-semibold',
                    active || completed ? 'text-on-surface' : 'text-secondary',
                  )}
                >
                  {step}
                </span>
              </button>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px min-w-4 flex-1',
                    index < current ? 'bg-primary' : 'bg-outline-variant',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
