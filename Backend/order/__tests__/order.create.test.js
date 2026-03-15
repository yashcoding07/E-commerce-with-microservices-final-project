const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Order = require('../src/models/order.model');
const axios = require('axios'); // Require axios

// ** 1. Mock Axios globally for the whole file **
jest.mock('axios');

describe('POST /api/orders/', () => {
    let userToken;
    let userId;

    beforeAll(() => {
        userId = new mongoose.Types.ObjectId();
        userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET || "test-secret");
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await Order.deleteMany({});
    });
    
    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('returns 401 without auth token', async () => {
        const res = await request(app)
            .post('/api/orders/')
            .send({
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '12345',
                    country: 'Test Country'
                }
            });

        expect(res.status).toBe(401);
    });

    it('creates a new order from current cart successfully', async () => {
        const mockProductId = new mongoose.Types.ObjectId();

        // ** 2. Define Axios Mock behavior for successful cart and product fetch **
        axios.get.mockImplementation((url) => {
            if (url.includes('3002/api/cart/')) {
                // Mock Cart Service response
                return Promise.resolve({
                    data: {
                        items: [
                            {
                                product: mockProductId,
                                quantity: 2,
                                priceAtAddition: 100 // Using priceAtAddition based on controller fix
                            }
                        ]
                    }
                });
            } else if (url.includes('3001/api/products/')) {
                // Mock Product Service response
                return Promise.resolve({
                    data: {
                        product: {
                            _id: mockProductId,
                            title: "Test Product",
                            stock: 5 // Sufficient stock
                        }
                    }
                });
            }
            return Promise.reject(new Error('URL not mocked'));
        });

        const shippingAddress = {
            street: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            pincode: '12345',
            country: 'Test Country'
        };

        const res = await request(app)
            .post('/api/orders/')
            .set('Cookie', `token=${userToken}`)
            .send({ shippingAddress });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('order');
        expect(res.body.order.status).toBe('pending');
        expect(res.body.order.user.toString()).toBe(userId.toString());
        expect(res.body.order).toHaveProperty('items');
        expect(res.body.order.items.length).toBe(1);

        expect(res.body.order.items[0]).toHaveProperty('price');
        expect(res.body.order.items[0].price).toHaveProperty('amount', 200); // 100 * 2
        expect(res.body.order.items[0].price).toHaveProperty('currency', 'INR');
        expect(res.body.order.shippingAddress.street).toBe(shippingAddress.street);
    });

    it('returns 400 if cart is empty', async () => {
        // Mock to simulate an empty cart scenario
        axios.get.mockResolvedValueOnce({
            data: { items: [] } // Empty items array sent back from mocked Cart Service
        });

        const res = await request(app)
            .post('/api/orders/')
            .set('Cookie', `token=${userToken}`)
            .send({
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '12345',
                    country: 'Test Country'
                }
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Cart is empty");
    });

    it('returns 400 if product is out of stock', async () => {
        const mockProductId = new mongoose.Types.ObjectId();

        // Mock to simulate inventory reservation failure (e.g. out of stock)
        axios.get.mockImplementation((url) => {
            if (url.includes('3002/api/cart/')) {
                return Promise.resolve({
                    data: {
                        items: [
                            {
                                product: mockProductId,
                                quantity: 10,
                                priceAtAddition: 100
                            }
                        ]
                    }
                });
            } else if (url.includes('3001/api/products/')) {
                // Out of stock response
                return Promise.resolve({
                    data: {
                        product: {
                            _id: mockProductId,
                            title: "Test Product",
                            stock: 2 // Has 2 but requests 10
                        }
                    }
                });
            }
            return Promise.reject(new Error('URL not mocked'));
        });

        const res = await request(app)
            .post('/api/orders/')
            .set('Cookie', `token=${userToken}`)
            .send({
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '12345',
                    country: 'Test Country'
                }
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('out of stock');
    });
});
