import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTheater } from '@/lib/theater';
import { parseWorkspace } from '@/lib/workspaces';

test('legacy theater inputs normalize to the single global theater', () => {
  assert.equal(parseTheater('global'), 'global');
  assert.equal(parseTheater('middle-east'), 'global');
  assert.equal(parseTheater('ukraine'), 'global');
});

test('legacy workspace aliases normalize to global', () => {
  assert.equal(parseWorkspace('global'), 'global');
  assert.equal(parseWorkspace('middle-east'), 'global');
  assert.equal(parseWorkspace('ukraine'), 'global');
  assert.equal(parseWorkspace('network'), 'network');
});
