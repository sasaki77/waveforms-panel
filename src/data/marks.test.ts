import { testFrame } from './frames.testutil';
import { makeMarks } from './marks';

describe('makeMarks', () => {
  it('returns no marks without any series', () => {
    expect(makeMarks([])).toEqual({});
  });

  it('labels the first and last waveform with their timestamp column names', () => {
    const frame = testFrame({
      refId: 'A',
      index: [0, 1],
      columns: { t0: [1, 2], t1: [3, 4], t2: [5, 6] },
    });

    expect(makeMarks([frame])).toEqual({ '0': ['t0'], '2': ['t2'] });
  });

  it('collapses both marks onto one position for a single waveform', () => {
    const frame = testFrame({ refId: 'A', index: [0, 1], columns: { t0: [1, 2] } });

    expect(makeMarks([frame])).toEqual({ '0': ['t0'] });
  });

  // A frame with nothing after the index column used to read fields[1].name off
  // undefined and throw during render.
  it('returns no marks for a frame carrying only the index column', () => {
    const frame = testFrame({ refId: 'A', index: [0, 1] });

    expect(makeMarks([frame])).toEqual({});
  });

  it('returns no marks for a frame with no fields at all', () => {
    const frame = { refId: 'A', fields: [], length: 0 } as unknown as ReturnType<typeof testFrame>;

    expect(makeMarks([frame])).toEqual({});
  });
});
