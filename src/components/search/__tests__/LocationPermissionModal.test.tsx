import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationPermissionModal } from '../LocationPermissionModal';

describe('LocationPermissionModal', () => {
  it('uses modal semantics, focuses the primary action, and traps keyboard focus', async () => {
    const onDismiss = vi.fn();

    render(
      <LocationPermissionModal
        isOpen
        onAllow={() => undefined}
        onDismiss={onDismiss}
      />
    );

    const dialog = await screen.findByRole('dialog', { name: '주변 유치원을 찾기 위해' });
    const allowButton = screen.getByRole('button', { name: '위치 허용하기' });
    const dismissButton = screen.getByRole('button', { name: '나중에' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toBe(document.body);
    await waitFor(() => expect(allowButton).toHaveFocus());

    dismissButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(allowButton).toHaveFocus();

    allowButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(dismissButton).toHaveFocus();
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onDismiss = vi.fn();

    const { rerender } = render(
      <LocationPermissionModal
        isOpen
        onAllow={() => undefined}
        onDismiss={onDismiss}
      />
    );

    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledOnce();

    rerender(
      <LocationPermissionModal
        isOpen={false}
        onAllow={() => undefined}
        onDismiss={onDismiss}
      />
    );
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
  });
});
