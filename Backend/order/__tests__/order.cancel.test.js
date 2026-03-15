const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Order = require('../src/models/order.model');

describe('POST /api/orders/:id/cancel', () => {
    let userToken;
    let userId;
    let otherUserId;
    let otherUserToken;

    const makeAddress = () => ({
        street: '789 Elm Blvd',
        city: 'Cancel City',
        state: 'Cancel State',
        pincode: '99999',
        country: 'India'
    });

    const makeOrderData = (uid, overrides = {}) => ({
        user: uid,
        items: [
            {
                product: new mongoose.Types.ObjectId(),
                quantity: 1,
                price: { amount: 500, currency: 'INR' }
            }
        ],
        totalPrice: { amount: 500, currency: 'INR' },
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
        const res = await request(app).post(`/api/orders/${orderId}/cancel`);
        expect(res.status).toBe(401);
    });

    // ──── Successful cancellation ────────────────────────

    it('cancels a pending order and returns 200', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'pending' }));

        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.order.status).toBe('cancelled');

        // Verify in DB
        const updated = await Order.findById(order._id);
        expect(updated.status).toBe('cancelled');
    });

    it('cancels a confirmed (paid) order and returns 200', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'confirmed' }));

        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.order.status).toBe('cancelled');
    });

    // ──── Status rules (cannot cancel after shipped/delivered) ──

    it('returns 400 when trying to cancel a shipped order', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'shipped' }));

        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(400);
    });

    it('returns 400 when trying to cancel a delivered order', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'delivered' }));

        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(400);
    });

    it('returns 400 when trying to cancel an already cancelled order', async () => {
        const order = await Order.create(makeOrderData(userId, { status: 'cancelled' }));

        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(400);
    });

    // ──── Authorization ──────────────────────────────────

    it('returns 403 when a different user tries to cancel the order', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${otherUserToken}`);

        expect(res.status).toBe(403);
    });

    // ──── Not found / Invalid ID ─────────────────────────

    it('returns 404 for a non-existent order id', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post(`/api/orders/${fakeId}/cancel`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid (non-ObjectId) id', async () => {
        const res = await request(app)
            .post('/api/orders/invalid-id/cancel')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(400);
    });
});
