import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../app';

describe('Folders API', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const email = `folder.test+${Date.now()}@example.com`;
    const password = 'Password123!';
    await request(app).post('/api/auth/register').send({ email, password });
    const login = await request(app).post('/api/auth/login').send({ email, password });
    token = login.body.token;
  });

  it('should create, rename and delete a folder', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/files/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Folder' });
    
    expect(createRes.status).toBe(200);
    const folderId = createRes.body.id;
    expect(folderId).toBeDefined();

    // 2. Rename
    const renameRes = await request(app)
      .patch(`/api/files/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Folder' });
    
    expect(renameRes.status).toBe(200);
    expect(renameRes.body.updated).toBe(1);

    // 3. Delete
    const deleteRes = await request(app)
      .delete(`/api/files/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(1);
  });

  it('should not delete a non-empty folder', async () => {
    // 1. Create parent
    const parentRes = await request(app)
      .post('/api/files/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Parent Folder' });
    const parentId = parentRes.body.id;

    // 2. Create child
    await request(app)
      .post('/api/files/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Child Folder', parent_id: parentId });

    // 3. Try to delete parent
    const deleteRes = await request(app)
      .delete(`/api/files/folders/${parentId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error).toContain('not empty');
  });
});
