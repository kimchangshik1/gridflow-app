#!/usr/bin/env node
'use strict';

/**
 * One-off auth capture harness for public runtime.
 *
 * Execution:
 *   node /home/ubuntu/upbit_bot/evidence/raw/auth_mode_triptych_capture.js
 *
 * Internals:
 *   - create guest session via HTTPS POST
 *   - build Playwright storage state from returned token
 *   - call official Playwright CLI screenshot path
 *
 * Current scope:
 *   - login overlay screenshot
 *   - guest_mode_badge screenshot
 *
 * Deferred:
 *   - logout overlay return
 *   - refresh session result
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const BASE_URL = 'https://gridflow.co.kr/';
const GUEST_SESSION_URL = 'https://gridflow.co.kr/auth/guest/session';
const OUT_DIR = '/home/ubuntu/upbit_bot/evidence/raw/screenshots/auth';
const STORAGE_FILE = path.join(OUT_DIR, 'guest_storage_state.json');
const RESULT_FILE = path.join(OUT_DIR, 'auth_mode_triptych_capture_result.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(target, payload) {
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8');
}

function postGuestSession() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      GUEST_SESSION_URL,
      {
        method: 'POST',
        headers: {
          'X-GridFlow-State-Change': '1',
          'Content-Length': '2',
        },
      },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            resolve({
              statusCode: res.statusCode || 0,
              body: parsed,
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

function buildStorageState(token) {
  return {
    cookies: [
      {
        name: 'session',
        value: token,
        domain: 'gridflow.co.kr',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };
}

function runScreenshot(args) {
  return execFileSync('npx', ['playwright', 'screenshot', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main() {
  ensureDir(OUT_DIR);

  const result = {
    base_url: BASE_URL,
    output_dir: OUT_DIR,
    started_at: new Date().toISOString(),
    shots: [],
    blockers: [],
    steps: [],
  };

  try {
    result.steps.push('capture_login_overlay_initial');
    runScreenshot([
      '--wait-for-timeout=3000',
      '--full-page',
      BASE_URL,
      path.join(OUT_DIR, 'login_overlay_initial.png'),
    ]);
    result.shots.push('login_overlay_initial.png');

    result.steps.push('create_guest_session');
    const guest = await postGuestSession();
    if (guest.statusCode !== 200 || !guest.body || !guest.body.token || !guest.body.is_guest) {
      result.blockers.push('guest_session_creation_failed');
      throw new Error(`guest session failed: status=${guest.statusCode}`);
    }

    result.steps.push('build_guest_storage_state');
    writeJson(STORAGE_FILE, buildStorageState(guest.body.token));

    result.steps.push('capture_guest_mode_badge');
    runScreenshot([
      `--load-storage=${STORAGE_FILE}`,
      '--wait-for-timeout=5000',
      '--full-page',
      BASE_URL,
      path.join(OUT_DIR, 'guest_mode_badge.png'),
    ]);
    result.shots.push('guest_mode_badge.png');

    result.guest_username = guest.body.username;
    result.guest_user_id = guest.body.user_id;
    result.mode = 'guest';

    result.blockers.push('logout_refresh_not_attempted_in_cli_harness');
    result.notes = [
      'This harness uses official Playwright screenshot CLI and storage-state injection.',
      'Logout/refresh flows remain separate because screenshot CLI alone does not provide click/navigation scripting.',
    ];
  } catch (error) {
    result.error = String(error && error.message ? error.message : error);
  } finally {
    result.finished_at = new Date().toISOString();
    writeJson(RESULT_FILE, result);
  }
}

main().catch(error => {
  ensureDir(OUT_DIR);
  writeJson(RESULT_FILE, {
    base_url: BASE_URL,
    output_dir: OUT_DIR,
    fatal_error: String(error && error.message ? error.message : error),
    finished_at: new Date().toISOString(),
  });
  process.exitCode = 1;
});
