// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { Modal } from './Modal';

afterEach(cleanup);

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <Modal onClose={() => setOpen(false)} open={open} title="Confirm action">
        <button>First action</button>
        <button>Last action</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('traps keyboard focus, closes on Escape, and restores prior focus', () => {
    render(<ModalHarness />);
    const openButton = screen.getByRole('button', { name: 'Open dialog' });
    openButton.focus();
    fireEvent.click(openButton);

    const firstAction = screen.getByRole('button', { name: 'First action' });
    const lastAction = screen.getByRole('button', { name: 'Last action' });
    expect(document.activeElement).toBe(firstAction);

    lastAction.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(firstAction);
    firstAction.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastAction);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(openButton);
  });
});
