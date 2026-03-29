import test from 'node:test';
import assert from 'node:assert/strict';

import { getMediaTypeForPath } from './content-store.js';

test('getMediaTypeForPath maps mp4 assets to video/mp4', () => {
  assert.equal(getMediaTypeForPath('videos/demo.mp4'), 'video/mp4');
});
