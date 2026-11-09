import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StatusChip from './components/common/StatusChip';
import ScoreRing from './components/common/ScoreRing';

describe('Frontend Component Tests', () => {
  it('renders StatusChip with correct label', () => {
    render(<StatusChip status="completed" />);
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('renders StatusChip with delayed status and clay color', () => {
    render(<StatusChip status="delayed" />);
    expect(screen.getByText('Delayed')).toBeDefined();
  });

  it('renders ScoreRing with correct aria role and label', () => {
    render(<ScoreRing score={75} size={100} showIcon={false} />);
    expect(screen.getByRole('img', { name: /Score: 75 out of 100/i })).toBeDefined();
    expect(screen.getByText('/ 100')).toBeDefined();
  });
});
