import request from 'supertest';
import { app } from '../../src/app';

describe('Categories API', () => {
  describe('GET /api/categories', () => {
    it('should return categories list', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return categories with correct structure', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      if (response.body.data.length > 0) {
        const category = response.body.data[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('slug');
      }
    });
  });
});