// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { IconButton } from './IconButton';

afterEach(cleanup);

describe('IconButton', () => {
  it('exposes its required label as the accessible name and tooltip', () => {
    render(<IconButton icon={<span>×</span>} label="Close dialog" onClick={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Close dialog' }).getAttribute('title')).toBe(
      'Close dialog',
    );
  });

  it('passes the accessible-name check', async () => {
    const { container } = render(
      <IconButton icon={<span>×</span>} label="Close dialog" onClick={() => undefined} />,
    );
    const results = await axe.run(container, { runOnly: ['button-name'] });
    expect(results.violations).toEqual([]);
  });
});
