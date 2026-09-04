import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APP_ROLES,
  AUTH_FLOW_STEPS,
  isValidPhoneNumber,
} from '../packages/shared/src/index';

test('Phase 1: application roles exist for USER, ADMIN and SUPER_ADMIN', () => {
  assert.deepEqual(APP_ROLES, ['USER', 'ADMIN', 'SUPER_ADMIN']);
});

test('Phase 1: phone number validation accepts valid E.164-style values', () => {
  assert.equal(isValidPhoneNumber('+919876543210'), true);
  assert.equal(isValidPhoneNumber('9876543210'), true);
  assert.equal(isValidPhoneNumber('abc'), false);
});

test('Phase 1: first-time and forgot-password auth steps are defined', () => {
  assert.deepEqual(AUTH_FLOW_STEPS.firstLogin, ['phone-otp', 'profile-setup', 'password-setup']);
  assert.deepEqual(AUTH_FLOW_STEPS.subsequentLogin, ['phone-password']);
  assert.deepEqual(AUTH_FLOW_STEPS.forgotPassword, ['phone-otp', 'new-password']);
});
