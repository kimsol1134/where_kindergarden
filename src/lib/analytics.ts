import { track } from '@vercel/analytics';

type EventValue = string | number | boolean | null | undefined;

export type UXEventName =
  | 'search_started'
  | 'search_card_opened'
  | 'compare_opened'
  | 'compare_shared'
  | 'test_started'
  | 'test_to_search';

export function trackUXEvent(
  eventName: UXEventName,
  payload?: Record<string, EventValue>
): void {
  try {
    track(eventName, payload);
  } catch {
    // Analytics must never block the core UX flow.
  }
}
