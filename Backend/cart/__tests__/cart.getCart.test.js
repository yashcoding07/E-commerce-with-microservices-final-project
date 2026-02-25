const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Cart = require('../src/models/cart.model');

// Mock product service to simulate price recomputation
jest.mock('../src/services/product.service', () => ({
    getProductsByIds: jest.fn(async (ids) => {
        return ids.map(id => ({
            _id: id,
            price: { amount: 100, currency: 'USD' } // Standard price for testing recomputation
        }));
    })
}));

describe('GET /api/cart', () => {
    let userToken;
    let userId;

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET);
    });

    it('returns empty cart for new user', async () => {
        const res = await request(app)
            .get('/api/cart')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
        expect(res.body.totalAmount).toBe(0);
    });

    it('returns cart with items and recomputed prices', async () => {
        const productId = new mongoose.Types.ObjectId();
        // Manually seed a cart with a stale price or just items
        await Cart.create({
            user: userId,
            items: [{ product: productId, quantity: 2 }]
        });

        const res = await request(app)
            .get('/api/cart')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.items.length).toBe(1);
        expect(res.body.items[0].product.toString()).toBe(productId.toString());
        expect(res.body.items[0].priceAtAddition).toBe(100); // Recomputed
        expect(res.body.totalAmount).toBe(200); // 100 * 2
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app).get('/api/cart');
        expect(res.status).toBe(401);
    });
});
