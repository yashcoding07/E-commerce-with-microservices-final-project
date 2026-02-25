const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Cart = require('../src/models/cart.model');

describe('DELETE /api/cart/items/:productId', () => {
    let userToken;
    let userId;

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET);
    });

    it('removes an existing item from the cart', async () => {
        const productId = new mongoose.Types.ObjectId();
        await Cart.create({
            user: userId,
            items: [{ product: productId, quantity: 1 }]
        });

        const res = await request(app)
            .delete(`/api/cart/items/${productId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        const cart = await Cart.findOne({ user: userId });
        expect(cart.items.length).toBe(0);
    });

    it('returns 404 when product is not in cart', async () => {
        const res = await request(app)
            .delete(`/api/cart/items/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(404);
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app).delete(`/api/cart/items/${new mongoose.Types.ObjectId()}`);
        expect(res.status).toBe(401);
    });
});
