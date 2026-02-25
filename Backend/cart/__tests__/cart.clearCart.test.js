const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Cart = require('../src/models/cart.model');

describe('DELETE /api/cart', () => {
    let userToken;
    let userId;

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET);
    });

    it('clears all items from the cart', async () => {
        await Cart.create({
            user: userId,
            items: [
                { product: new mongoose.Types.ObjectId(), quantity: 1 },
                { product: new mongoose.Types.ObjectId(), quantity: 2 }
            ]
        });

        const res = await request(app)
            .delete('/api/cart')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        const cart = await Cart.findOne({ user: userId });
        expect(cart.items.length).toBe(0);
    });

    it('returns 200 even if the cart is already empty', async () => {
        const res = await request(app)
            .delete('/api/cart')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app).delete('/api/cart');
        expect(res.status).toBe(401);
    });
});
