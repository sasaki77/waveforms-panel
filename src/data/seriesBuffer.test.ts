import { testFrame } from './frames.testutil';
import { fillPoints, isAscending, makeSeriesBuffers, makeSeriesNames } from './seriesBuffer';

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

describe('makeSeriesNames', () => {
  it('uses the frame name when it has one', () => {
    const names = makeSeriesNames([testFrame({ refId: 'A', name: 'PV1' }), testFrame({ refId: 'A', name: 'PV2' })]);

    expect(names).toEqual(['PV1', 'PV2']);
  });

  // How getFrameDisplayName names an unnamed frame, so the legend reads the way
  // Grafana's own panels do.
  it('names an unnamed frame after its refId, and after its position without one', () => {
    const names = makeSeriesNames([testFrame({ refId: 'A' }), testFrame({})]);

    expect(names).toEqual(['Series (A)', 'Series (1)']);
  });

  it('numbers frames that would otherwise read the same', () => {
    const names = makeSeriesNames([
      testFrame({ refId: 'A', name: 'PV1' }),
      testFrame({ refId: 'B', name: 'PV1' }),
      testFrame({ refId: 'C', name: 'PV2' }),
    ]);

    expect(names).toEqual(['PV1', 'PV1 2', 'PV2']);
  });

  // The numbering is just text, so a frame can be named to look like one. Every
  // name is checked against what has already been handed out, so this needs no
  // special case.
  it('steps over a frame whose name already spells out a numbered one', () => {
    const names = makeSeriesNames([
      testFrame({ name: 'PV1' }),
      testFrame({ name: 'PV1' }),
      testFrame({ name: 'PV1 2' }),
    ]);

    expect(new Set(names).size).toBe(3);
  });

  it('never repeats a name, whatever the frames look like', () => {
    const names = makeSeriesNames([
      testFrame({}),
      testFrame({ refId: 'A' }),
      testFrame({ refId: 'A' }),
      testFrame({ name: 'PV1' }),
      testFrame({ refId: 'A', name: 'PV1' }),
      testFrame({ name: 'PV1 2' }),
      testFrame({ name: 'Series (A)' }),
      testFrame({ name: 'Series (0)' }),
      testFrame({}),
    ]);

    expect(new Set(names).size).toBe(names.length);
  });

  it('numbers within the duplicated group, so an unrelated series ahead does not renumber it', () => {
    const duplicates = [testFrame({ name: 'PV1' }), testFrame({ name: 'PV1' })];

    const before = makeSeriesNames(duplicates);
    const after = makeSeriesNames([testFrame({ name: 'other' }), ...duplicates]);

    expect(before).toEqual(['PV1', 'PV1 2']);
    expect(after.slice(1)).toEqual(before);
  });

  it('derives the same names from the same frames, so hidden series survive a refresh', () => {
    const frames = () => [testFrame({ refId: 'A', name: 'PV1' }), testFrame({ refId: 'A', name: 'PV1' })];

    expect(makeSeriesNames(frames())).toEqual(makeSeriesNames(frames()));
  });
});

describe('makeSeriesBuffers', () => {
  // The legend shows the name and keys its state off the key, so a click only
  // lands on the right series while the two agree.
  it('gives every buffer the same string for its key and its name', () => {
    const frames = [
      testFrame({ refId: 'A', name: 'PV1', index: [0] }),
      testFrame({ refId: 'A', name: 'PV1', index: [0] }),
      testFrame({ index: [0] }),
    ];

    const buffers = makeSeriesBuffers(frames);

    expect(buffers.map((b) => b.key)).toEqual(makeSeriesNames(frames));
    expect(buffers.map((b) => b.name)).toEqual(buffers.map((b) => b.key));
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
