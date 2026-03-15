const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Order = require('../src/models/order.model');

describe('PATCH /api/orders/:id/address', () => {
    let userToken;
    let userId;
    let otherUserId;
    let otherUserToken;

    const makeAddress = () => ({
        street: '100 Old St',
        city: 'Old City',
        state: 'Old State',
        pincode: '11111',
        country: 'India'
    });

    const newAddress = {
        street: '200 New Ave',
        city: 'New City',
        state: 'New State',
        pincode: '22222',
        country: 'India'
    };

    const makeOrderData = (uid, overrides = {}) => ({
        user: uid,
        items: [
            {
                product: new mongoose.Types.ObjectId(),
                quantity: 1,
                price: { amount: 300, currency: 'INR' }
            }
        ],
        totalPrice: { amount: 300, currency: 'INR' },
        status: 'pending',
        shippingAddress: makeAddress(),
        ...overrides
    });

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        otherUserId = new mongoose.Types.ObjectId();
        userToken = jwt.sign(
            { id: userId.toHexString(), role: 'user' },
            process.env.JWT_SECRET || 'test-secret'
        );
        otherUserToken = jwt.sign(
            { id: otherUserId.toHexString(), role: 'user' },
            process.env.JWT_SECRET || 'test-secret'
        );
    });

    afterEach(async () => {
        await Order.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // ──── Auth ────────────────────────────────────────────

    it('returns 401 without auth token', async () => {
        const orderId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(401);
    });

    // ──── Successful update ──────────────────────────────

    it('updates address on a pending order and returns 200', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'pending' }));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(200);
        expect(res.body.order.shippingAddress.street).toBe(newAddress.street);
        expect(res.body.order.shippingAddress.city).toBe(newAddress.city);
        expect(res.body.order.shippingAddress.pincode).toBe(newAddress.pincode);

        // Verify in DB
        const updated = await Order.findById(order._id);
        expect(updated.shippingAddress.street).toBe(newAddress.street);
    });

    // ──── Status rules (only before payment capture) ─────

    it('returns 400 when order is already confirmed (paid)', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'confirmed' }));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(400);
    });

    it('returns 400 when order is shipped', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'shipped' }));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(400);
    });

    it('returns 400 when order is delivered', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'delivered' }));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(400);
    });

    it('returns 400 when order is cancelled', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'cancelled' }));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(400);
    });

    // ──── Validation ─────────────────────────────────────

    it('returns 400 when shippingAddress is missing', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({});

        expect(res.status).toBe(400);
    });

    it('returns 400 when shippingAddress fields are incomplete', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: { street: '123' } }); // missing other fields

        expect(res.status).toBe(400);
    });

    // ──── Authorization ──────────────────────────────────

    it('returns 403 when a different user tries to update the address', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/address`)
            .set('Cookie', `token=${otherUserToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(403);
    });

    // ──── Not found / Invalid ID ─────────────────────────

    it('returns 404 for a non-existent order id', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .patch(`/api/orders/${fakeId}/address`)
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid (non-ObjectId) id', async () => {
        const res = await request(app)
            .patch('/api/orders/bad-id/address')
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress: newAddress });

        expect(res.status).toBe(400);
    });
});
