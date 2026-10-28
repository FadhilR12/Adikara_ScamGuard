import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-api-'));
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');

const { openDb } = await import('../src/db/client');
const { seed } = await import('../src/db/seed');
const { createApp } = await import('../src/app');

const db = openDb(':memory:');
seed(db);
const app = createApp(db);

const A = '5f1c2d3e-4b5a-4c6d-8e7f-0123456789ab';
const B = '6a2b3c4d-5e6f-4a7b-9c8d-abcdefabcdef';
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

describe('API ScamGuard', () => {
  let incidentId = '';

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/incidents').set('X-Device-Id', A).send({ source: 'popup', relatedDomain: 'investasi-cuan88.xyz' });
    incidentId = res.body.id;
  });

  it('GET /health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('menolak tanpa X-Device-Id', async () => {
    const res = await request(app).get('/api/v1/rules');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED_DEVICE');
  });

  it('GET /rules lalu 304 untuk versi yang sama', async () => {
    const res = await request(app).get('/api/v1/rules').set('X-Device-Id', A);
    expect(res.status).toBe(200);
    expect(res.body.schemaVersion).toBe(1);
    expect(res.body.text.length).toBeGreaterThan(5);
    const again = await request(app).get('/api/v1/rules').query({ since: res.body.version }).set('X-Device-Id', A);
    expect(again.status).toBe(304);
  });

  it('POST /risk/check teks berisiko → tinggi', async () => {
    const res = await request(app).post('/api/v1/risk/check').set('X-Device-Id', A)
      .send({ type: 'text', value: 'Profit tetap 30% per minggu, slot terbatas, transfer sekarang. Kirim kode OTP.', source: 'popup' });
    expect(res.status).toBe(200);
    expect(res.body.level).toBe('high');
    expect(res.body.id).toMatch(/^rc_/);
  });

  it('domain demo yang dilaporkan memicu URL_REPORTED', async () => {
    const res = await request(app).post('/api/v1/risk/check').set('X-Device-Id', A).send({ type: 'url', value: 'investasi-cuan88.xyz' });
    expect(res.body.reasons.map((r: { ruleId: string }) => r.ruleId)).toContain('URL_REPORTED');
  });

  it('validasi input kosong', async () => {
    const res = await request(app).post('/api/v1/risk/check').set('X-Device-Id', A).send({ type: 'url', value: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('laporan nomor menambah reported_entities', async () => {
    await request(app).post('/api/v1/feedback').set('X-Device-Id', A).send({ targetType: 'number', targetValue: '0812-1111-2222', kind: 'report' });
    const res = await request(app).post('/api/v1/risk/check').set('X-Device-Id', A).send({ type: 'number', value: '081211112222' });
    expect(res.body.reasons[0].ruleId).toBe('NUM_REPORTED');
  });

  it('incident: kode, PATCH, kelengkapan', async () => {
    const res = await request(app).patch(`/api/v1/incidents/${incidentId}`).set('X-Device-Id', A).send({
      currentStep: 2, checklist: { stopTransfer: true }, amount: 2500000, transferAt: '2026-10-27T14:32:00+07:00',
      recipientBank: 'BCA', recipientAccount: '8820-194829', chronology: 'Dihubungi lewat WhatsApp oleh akun investasi, diminta deposit awal.',
    });
    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^SG-\d{4}-0001$/);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.recipientAccount).toBe('8820194829');
    expect(res.body.completeness).toMatchObject({ done: 3, total: 6 });
  });

  it('PATCH menolak waktu transfer di masa depan', async () => {
    const res = await request(app).patch(`/api/v1/incidents/${incidentId}`).set('X-Device-Id', A).send({ transferAt: '2099-01-01T00:00:00+07:00' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('transferAt');
  });

  it('unggah bukti, unduh, dan akses device lain → 401 (FT-14)', async () => {
    const up = await request(app).post(`/api/v1/incidents/${incidentId}/evidence`).set('X-Device-Id', A)
      .field('category', 'transfer').attach('file', PNG, 'bukti.png');
    expect(up.status).toBe(201);
    expect(up.body.sha256).toHaveLength(64);
    expect(up.body.mime).toBe('image/png');

    const own = await request(app).get(`/api/v1/evidence/${up.body.id}/file`).set('X-Device-Id', A);
    expect(own.status).toBe(200);
    const other = await request(app).get(`/api/v1/evidence/${up.body.id}/file`).set('X-Device-Id', B);
    expect(other.status).toBe(401);
    const otherIncident = await request(app).get(`/api/v1/incidents/${incidentId}`).set('X-Device-Id', B);
    expect(otherIncident.status).toBe(401);
  });

  it('menolak file palsu (magic bytes) dan file > 10 MB (FT-11)', async () => {
    const fake = await request(app).post(`/api/v1/incidents/${incidentId}/evidence`).set('X-Device-Id', A)
      .attach('file', Buffer.from('<svg></svg>'), 'gambar.png');
    expect(fake.status).toBe(400);
    const big = await request(app).post(`/api/v1/incidents/${incidentId}/evidence`).set('X-Device-Id', A)
      .attach('file', Buffer.alloc(11 * 1024 * 1024), 'besar.png');
    expect(big.status).toBe(413);
    expect(big.body.error.message).toBe('File lebih dari 10 MB.');
  });

  it('pack-generated mengubah status', async () => {
    const res = await request(app).post(`/api/v1/incidents/${incidentId}/pack-generated`).set('X-Device-Id', A).send({ completeness: '4/6', files: 1 });
    expect(res.body.status).toBe('pack_generated');
  });

  it('daftar milik device & hapus', async () => {
    const list = await request(app).get('/api/v1/incidents').set('X-Device-Id', A);
    expect(list.body).toHaveLength(1);
    expect((await request(app).get('/api/v1/incidents').set('X-Device-Id', B)).body).toHaveLength(0);
    const del = await request(app).delete(`/api/v1/incidents/${incidentId}`).set('X-Device-Id', A);
    expect(del.status).toBe(204);
    expect(fs.existsSync(path.join(process.env.UPLOAD_DIR!, incidentId))).toBe(false);
  });

  it('events batch', async () => {
    const res = await request(app).post('/api/v1/events').set('X-Device-Id', A).send({ events: [{ name: 'overlay_shown', props: { score: 86 } }] });
    expect(res.status).toBe(202);
  });
});
