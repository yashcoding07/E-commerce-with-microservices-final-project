const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Order = require('../src/models/order.model');

describe('GET /api/orders/:id', () => {
    let userToken;
    let userId;
    let otherUserId;
    let otherUserToken;

    const makeAddress = () => ({
        street: '456 Oak Ave',
        city: 'Sample City',
        state: 'Sample State',
        pincode: '54321',
        country: 'India'
    });

    const makeOrderData = (uid, overrides = {}) => ({
        user: uid,
        items: [
            {
                product: new mongoose.Types.ObjectId(),
                quantity: 3,
                price: { amount: 900, currency: 'INR' }
            }
        ],
        totalPrice: { amount: 900, currency: 'INR' },
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
        const res = await request(app).get(`/api/orders/${orderId}`);
        expect(res.status).toBe(401);
    });

    // ──── Successful retrieval ───────────────────────────

    it('returns 200 with order details for the owner', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.order._id).toBe(order._id.toString());
        expect(res.body.order.status).toBe('pending');
        expect(res.body.order.items.length).toBe(1);
        expect(res.body.order.shippingAddress.city).toBe('Sample City');
    });

    it('includes timeline info (createdAt / updatedAt)', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.order).toHaveProperty('createdAt');
        expect(res.body.order).toHaveProperty('updatedAt');
    });

    it('includes payment summary (totalPrice)', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.order.totalPrice).toEqual({
            amount: 900,
            currency: 'INR'
        });
    });

    // ──── Authorization ──────────────────────────────────

    it('returns 403 when a different user tries to access the order', async () => {
        const order = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Cookie', `token=${otherUserToken}`);

        expect(res.status).toBe(403);
    });

    // ──── Not found / Invalid ID ─────────────────────────

    it('returns 404 for a non-existent order id', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/orders/${fakeId}`)
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid (non-ObjectId) id', async () => {
        const res = await request(app)
            .get('/api/orders/invalid-id-string')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(400);
    });
});
