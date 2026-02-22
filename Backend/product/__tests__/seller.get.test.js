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

describe('GET /api/products/seller', () => {
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

    it('returns all products belonging to the authenticated seller', async () => {
        await createProduct({ title: 'Product 1' });
        await createProduct({ title: 'Product 2' });

        const res = await request(app)
            .get('/api/products/seller')
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0].seller).toBe(sellerId.toHexString());
        expect(res.body.data[1].seller).toBe(sellerId.toHexString());
    });

    it('returns an empty array when the seller has no products', async () => {
        const res = await request(app)
            .get('/api/products/seller')
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it('does not return products belonging to other sellers', async () => {
        const otherSellerId = new mongoose.Types.ObjectId();

        await createProduct({ title: 'My Product', seller: sellerId });
        await createProduct({ title: 'Other Product', seller: otherSellerId });

        const res = await request(app)
            .get('/api/products/seller')
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe('My Product');
    });

    it('returns 401 when no auth token is provided', async () => {
        const res = await request(app)
            .get('/api/products/seller');

        expect(res.status).toBe(401);
    });

    it('returns 403 when a non-seller role tries to access', async () => {
        const userId = new mongoose.Types.ObjectId();
        const userToken = jwt.sign({ id: userId.toHexString(), role: 'user' }, process.env.JWT_SECRET);

        const res = await request(app)
            .get('/api/products/seller')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });
});
