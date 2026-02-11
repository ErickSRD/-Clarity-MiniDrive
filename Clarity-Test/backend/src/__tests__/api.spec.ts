import request from 'supertest';
import path from 'path';
import { describe, it, expect } from 'vitest';
import app from '../app';

describe('API integration', () => {
  it('registers, logs in, uploads a file and serves docs', async () => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'TestPass123!';

    const reg = await request(app).post('/api/auth/register').send({ email, password });
    expect(reg.status).toBe(200);
    expect(reg.body).toHaveProperty('id');

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const token = login.body.token;
    expect(token).toBeTruthy();

    const uploadPath = path.resolve(__dirname, '..', '..', '..', 'sample_upload.txt');
    const up = await request(app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('files', uploadPath);
    expect(up.status).toBe(200);
    expect(up.body).toHaveProperty('uploaded');

    const docs = await request(app).get('/api/docs/');
    expect(docs.status).toBe(200);
  }, 20000);
});
