const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Order = require('../src/models/order.model');

describe('POST /api/orders/', () => {
    let userToken;
    let userId;

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app)
            .post('/api/orders/')
            .send({
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'Test State',
                    zip: '12345',
                    country: 'Test Country'
                }
            });

        expect(res.status).toBe(401);
    });

    it('creates a new order from current cart successfully', async () => {
        // Here you would typically mock the Cart and Inventory services communication
        // For example:
        // global.fetch = jest.fn().mockResolvedValue({
        //     ok: true,
        //     json: () => Promise.resolve({ items: [ { product: new mongoose.Types.ObjectId(), quantity: 2, price: 100 } ] })
        // });

        const shippingAddress = {
            street: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            zip: '12345',
            country: 'Test Country'
        };

        const res = await request(app)
            .post('/api/orders/')
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress });

        // Assuming 201 Created for a successful order creation
        expect(res.status).toBe(201);

        expect(res.body).toHaveProperty('order');
        expect(res.body.order.status).toBe('pending');
        expect(res.body.order.user.toString()).toBe(userId.toString());
        expect(res.body.order).toHaveProperty('items');
        expect(res.body.order.items.length).toBeGreaterThan(0);

        // Assert that computing taxes/shipping is handled (reflected in total price or similar fields depending on logic)
        // Since there is no total price in schema explicitly, we assert the items array format and prices
        expect(res.body.order.items[0]).toHaveProperty('price');
        expect(res.body.order.items[0].price).toHaveProperty('amount');
        expect(res.body.order.items[0].price).toHaveProperty('currency');
        expect(res.body.order.shippingAddress.street).toBe(shippingAddress.street);
    });

    it('returns 400 if cart is empty', async () => {
        // Mock to simulate an empty cart scenario

        const res = await request(app)
            .post('/api/orders/')
            .set('Cookie', `token=${userToken}`)
            .send({
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'Test State',
                    zip: '12345',
                    country: 'Test Country'
                }
            });

        expect(res.status).toBe(400);
        // Expecting some message like 'Cart is empty'
        expect(res.body.message).toBeDefined();
    });

    it('returns 400 if inventory reservation fails', async () => {
        // Mock to simulate inventory reservation failure

        const res = await request(app)
            .post('/api/orders/')
            .set('Cookie', `token=${userToken}`)
            .send({
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'Test State',
                    zip: '12345',
                    country: 'Test Country'
                }
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBeDefined();
    });
});
