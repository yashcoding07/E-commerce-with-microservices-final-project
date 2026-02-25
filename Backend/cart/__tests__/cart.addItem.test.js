const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Cart = require('../src/models/cart.model');

describe('POST /api/cart/items', () => {
    let userToken;
    let userId;

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET);
    });

    it('adds a new item to an empty cart', async () => {
        const productId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post('/api/cart/items')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId, quantity: 1 });

        expect(res.status).toBe(200);
        expect(res.body.items.length).toBe(1);
        expect(res.body.items[0].product.toString()).toBe(productId.toString());
        expect(res.body.items[0].quantity).toBe(1);
    });

    it('increments quantity when adding existing item', async () => {
        const productId = new mongoose.Types.ObjectId();
        await Cart.create({
            user: userId,
            items: [{ product: productId, quantity: 1 }]
        });

        const res = await request(app)
            .post('/api/cart/items')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId, quantity: 2 });

        expect(res.status).toBe(200);
        const cart = await Cart.findOne({ user: userId });
        expect(cart.items[0].quantity).toBe(3);
    });

    it('returns 400 for invalid quantity', async () => {
        const res = await request(app)
            .post('/api/cart/items')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ productId: new mongoose.Types.ObjectId(), quantity: 0 });

        expect(res.status).toBe(400);
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app).post('/api/cart/items').send({ productId: new mongoose.Types.ObjectId(), quantity: 1 });
        expect(res.status).toBe(401);
    });
});
