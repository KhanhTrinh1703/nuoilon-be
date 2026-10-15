import { formatMonthsDuration } from './format-duration.util';

describe('formatMonthsDuration', () => {
  it.each([
    [0, '0 tháng'],
    [8, '8 tháng'],
    [11, '11 tháng'],
    [12, '1 năm'],
    [18, '1 năm 6 tháng'],
    [24, '2 năm'],
    [25, '2 năm 1 tháng'],
  ])('%d -> %s', (input, expected) => {
    expect(formatMonthsDuration(input)).toBe(expected);
  });
});
