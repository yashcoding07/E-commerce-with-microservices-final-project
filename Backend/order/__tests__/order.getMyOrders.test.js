const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Order = require('../src/models/order.model');

describe('GET /api/orders/me', () => {
    let userToken;
    let userId;
    let otherUserId;

    const makeAddress = () => ({
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        pincode: '12345',
        country: 'Test Country'
    });

    const makeOrderData = (uid, overrides = {}) => ({
        user: uid,
        items: [
            {
                product: new mongoose.Types.ObjectId(),
                quantity: 2,
                price: { amount: 200, currency: 'INR' }
            }
        ],
        totalPrice: { amount: 200, currency: 'INR' },
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
    });

    afterEach(async () => {
        await Order.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // ──── Auth ────────────────────────────────────────────

    it('returns 401 without auth token', async () => {
        const res = await request(app).get('/api/orders/me');
        expect(res.status).toBe(401);
    });

    // ──── Successful retrieval ───────────────────────────

    it('returns 200 with an empty list when user has no orders', async () => {
        const res = await request(app)
            .get('/api/orders/me')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.orders).toEqual([]);
        expect(res.body.totalOrders).toBe(0);
        expect(res.body.totalPages).toBe(0);
    });

    it('returns only the logged-in user\'s orders', async () => {
        // Seed orders for two different users
        await Order.create(makeOrderData(userId));
        await Order.create(makeOrderData(userId));
        await Order.create(makeOrderData(otherUserId)); // should NOT appear

        const res = await request(app)
            .get('/api/orders/me')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.orders.length).toBe(2);
        res.body.orders.forEach((order) => {
            expect(order.user.toString()).toBe(userId.toString());
        });
    });

    it('returns orders sorted by createdAt descending (newest first)', async () => {
        const older = await Order.create(makeOrderData(userId));
        // small delay so timestamps differ
        const newer = await Order.create(makeOrderData(userId));

        const res = await request(app)
            .get('/api/orders/me')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        const ids = res.body.orders.map((o) => o._id);
        expect(ids[0]).toBe(newer._id.toString());
        expect(ids[1]).toBe(older._id.toString());
    });

    // ──── Pagination ─────────────────────────────────────

    it('defaults to page=1 and limit=10', async () => {
        // Create 3 orders
        for (let i = 0; i < 3; i++) {
            await Order.create(makeOrderData(userId));
        }

        const res = await request(app)
            .get('/api/orders/me')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(10);
        expect(res.body.orders.length).toBe(3);
        expect(res.body.totalOrders).toBe(3);
        expect(res.body.totalPages).toBe(1);
    });

    it('paginates correctly with custom page and limit', async () => {
        // Seed 5 orders
        for (let i = 0; i < 5; i++) {
            await Order.create(makeOrderData(userId));
        }

        const res = await request(app)
            .get('/api/orders/me?page=2&limit=2')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.page).toBe(2);
        expect(res.body.limit).toBe(2);
        expect(res.body.orders.length).toBe(2);
        expect(res.body.totalOrders).toBe(5);
        expect(res.body.totalPages).toBe(3);
    });

    it('returns empty list when page exceeds total pages', async () => {
        await Order.create(makeOrderData(userId));

        const res = await request(app)
            .get('/api/orders/me?page=99')
            .set('Cookie', `token=${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.orders.length).toBe(0);
        expect(res.body.totalOrders).toBe(1);
    });
});
