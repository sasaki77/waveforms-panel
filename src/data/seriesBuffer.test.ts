import { testFrame } from './frames.testutil';
import { fillPoints, isAscending, makeSeriesBuffers } from './seriesBuffer';

describe('isAscending', () => {
  it('accepts a strictly increasing column', () => {
    expect(isAscending([0, 1, 2, 3])).toBe(true);
  });

  it('accepts a single value and an empty column', () => {
    expect(isAscending([7])).toBe(true);
    expect(isAscending([])).toBe(true);
  });

  it('rejects a descending column', () => {
    expect(isAscending([0, 2, 1])).toBe(false);
  });

  // Equal neighbours break the promise `normalized` makes to Chart.js, so `>`
  // rather than `>=` is deliberate.
  it('rejects repeated values', () => {
    expect(isAscending([0, 1, 1, 2])).toBe(false);
  });

  // The whole reason the check is phrased as `>` instead of the inverse `<=`.
  it('rejects a column containing NaN', () => {
    expect(isAscending([0, NaN, 2])).toBe(false);
    expect(isAscending([0, 1, NaN])).toBe(false);
  });
});

describe('makeSeriesBuffers', () => {
  it('takes the key from refId, then name, then the position', () => {
    const buffers = makeSeriesBuffers([
      testFrame({ refId: 'A', name: 'ignored', index: [0] }),
      testFrame({ name: 'by-name', index: [0] }),
      testFrame({ index: [0] }),
    ]);

    expect(buffers.map((b) => b.key)).toEqual(['A', 'by-name', 'series-2']);
  });

  it('falls back to "Series" when the frame is unnamed', () => {
    const [buffer] = makeSeriesBuffers([testFrame({ refId: 'A', index: [0] })]);

    expect(buffer.name).toBe('Series');
  });

  it('seeds x from the index column and leaves y unset', () => {
    const [buffer] = makeSeriesBuffers([testFrame({ refId: 'A', index: [10, 20, 30] })]);

    expect(buffer.points).toHaveLength(3);
    expect(buffer.points.map((p) => p.x)).toEqual([10, 20, 30]);
    expect(buffer.points.every((p) => Number.isNaN(p.y))).toBe(true);
  });

  it('reports whether the index column ascends', () => {
    const buffers = makeSeriesBuffers([
      testFrame({ refId: 'A', index: [0, 1, 2] }),
      testFrame({ refId: 'B', index: [2, 1, 0] }),
    ]);

    expect(buffers.map((b) => b.sorted)).toEqual([true, false]);
  });
});

describe('fillPoints', () => {
  it('writes the values into y', () => {
    const points = [
      { x: 0, y: NaN },
      { x: 1, y: NaN },
    ];

    expect(fillPoints(points, [5, 6]).map((p) => p.y)).toEqual([5, 6]);
  });

  // The buffer is allocated once and overwritten on every slider move. Handing
  // back a new array (or new point objects) would reintroduce the per-point
  // allocation this exists to avoid, so the identity is part of the contract.
  it('reuses the array and the point objects rather than allocating', () => {
    const points = [
      { x: 0, y: NaN },
      { x: 1, y: NaN },
    ];
    const first = points[0];

    const filled = fillPoints(points, [5, 6]);

    expect(filled).toBe(points);
    expect(filled[0]).toBe(first);

    fillPoints(points, [7, 8]);

    expect(filled[0]).toBe(first);
    expect(first.y).toBe(7);
  });
});
