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

describe('DELETE /api/products/:id', () => {
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

    it('deletes a product successfully', async () => {
        const product = await createProduct();

        const res = await request(app)
            .delete(`/api/products/${product._id}`)
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Product deleted successfully');

        // Verify the product no longer exists in the database
        const deleted = await Product.findById(product._id);
        expect(deleted).toBeNull();
    });

    it('returns 404 when product does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .delete(`/api/products/${fakeId}`)
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('product not found.');
    });

    it('returns 500 when an invalid (non-ObjectId) ID is provided', async () => {
        const res = await request(app)
            .delete('/api/products/invalid-id')
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Internal server error');
    });

    it('returns 401 when no auth token is provided', async () => {
        const product = await createProduct();

        const res = await request(app)
            .delete(`/api/products/${product._id}`);

        expect(res.status).toBe(401);
    });

    it('returns 403 when a non-owner tries to delete the product', async () => {
        const product = await createProduct();

        const otherSellerId = new mongoose.Types.ObjectId();
        const otherToken = jwt.sign({ id: otherSellerId.toHexString(), role: 'seller' }, process.env.JWT_SECRET);

        const res = await request(app)
            .delete(`/api/products/${product._id}`)
            .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(403);
    });
});
