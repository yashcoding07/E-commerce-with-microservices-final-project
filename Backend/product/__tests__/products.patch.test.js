const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock imagekit service to avoid importing ESM-only uuid during tests
jest.mock('../src/services/imagekit.service', () => ({
    uploadImage: jest.fn(async () => ({ url: 'https://ik.mock/x', thumbnail: 'https://ik.mock/t', id: 'file_x' })),
}));

const app = require('../src/app');
const Product = require('../src/models/products.model');

describe('PATCH /api/products/:id', () => {
    let mongo;
    let sellerToken;
    let sellerId;

    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        const uri = mongo.getUri();
        process.env.MONGO_URI = uri;
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
        await mongoose.connect(uri);

        sellerId = new mongoose.Types.ObjectId();
        sellerToken = jwt.sign({ id: sellerId.toHexString(), role: 'seller' }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongo.stop();
    });

    afterEach(async () => {
        const collections = await mongoose.connection.db.collections();
        for (const c of collections) await c.deleteMany({});
    });

    const createProduct = (overrides = {}) => {
        return Product.create({
            title: overrides.title ?? 'Sample Product',
            description: overrides.description ?? 'A great product',
            price: overrides.price ?? { amount: 100, currency: 'USD' },
            seller: overrides.seller ?? sellerId,
            images: overrides.images ?? [],
        });
    };

    it('updates product title successfully', async () => {
        const product = await createProduct({ title: 'Old Title' });

        const res = await request(app)
            .patch(`/api/products/${product._id}`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ title: 'New Title' });

        expect(res.status).toBe(200);
        expect(res.body.product.title).toBe('New Title');
        // other fields should remain unchanged
        expect(res.body.product.description).toBe('A great product');
    });

    it('updates product price successfully', async () => {
        const product = await createProduct();

        const res = await request(app)
            .patch(`/api/products/${product._id}`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ priceAmount: 250, priceCurrency: 'INR' });

        expect(res.status).toBe(200);
        expect(res.body.product.price.amount).toBe(250);
        expect(res.body.product.price.currency).toBe('INR');
    });

    it('updates product description successfully', async () => {
        const product = await createProduct({ description: 'Old description' });

        const res = await request(app)
            .patch(`/api/products/${product._id}`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ description: 'Updated description' });

        expect(res.status).toBe(200);
        expect(res.body.product.description).toBe('Updated description');
    });

    it('returns 404 when product does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .patch(`/api/products/${fakeId}`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ title: 'Does not matter' });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('product not found.');
    });

    it('returns 500 when an invalid (non-ObjectId) ID is provided', async () => {
        const res = await request(app)
            .patch('/api/products/invalid-id')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ title: 'Does not matter' });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Internal server error');
    });

    it('returns 401 when no auth token is provided', async () => {
        const product = await createProduct();

        const res = await request(app)
            .patch(`/api/products/${product._id}`)
            .send({ title: 'Unauthorized update' });

        expect(res.status).toBe(401);
    });

    it('returns 403 when a non-owner tries to update the product', async () => {
        const product = await createProduct();

        const otherSellerId = new mongoose.Types.ObjectId();
        const otherToken = jwt.sign({ id: otherSellerId.toHexString(), role: 'seller' }, process.env.JWT_SECRET);

        const res = await request(app)
            .patch(`/api/products/${product._id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ title: 'Hijacked title' });

        expect(res.status).toBe(403);
    });
});
