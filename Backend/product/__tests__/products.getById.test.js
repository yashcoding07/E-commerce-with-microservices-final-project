const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock imagekit service to avoid importing ESM-only uuid during tests
jest.mock('../src/services/imagekit.service', () => ({
    uploadImage: jest.fn(async () => ({ url: 'https://ik.mock/x', thumbnail: 'https://ik.mock/t', id: 'file_x' })),
}));

const app = require('../src/app');
const Product = require('../src/models/products.model');

describe('GET /api/products/:id', () => {
    let mongo;

    beforeAll(async () => {
        mongo = await MongoMemoryServer.create();
        const uri = mongo.getUri();
        process.env.MONGO_URI = uri;
        await mongoose.connect(uri);
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
            seller: overrides.seller ?? new mongoose.Types.ObjectId(),
            images: overrides.images ?? [],
        });
    };

    it('returns a product when a valid ID is provided', async () => {
        const product = await createProduct({ title: 'Test Product', description: 'Test Desc' });

        const res = await request(app).get(`/api/products/${product._id}`);

        expect(res.status).toBe(200);
        expect(res.body.product).toBeDefined();
        expect(res.body.product._id).toBe(product._id.toString());
        expect(res.body.product.title).toBe('Test Product');
        expect(res.body.product.description).toBe('Test Desc');
        expect(res.body.product.price.amount).toBe(100);
        expect(res.body.product.price.currency).toBe('USD');
    });

    it('returns 404 when the product does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app).get(`/api/products/${fakeId}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('product not found.');
    });

    it('returns 500 when an invalid (non-ObjectId) ID is provided', async () => {
        const res = await request(app).get('/api/products/invalid-id');

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Internal server error');
    });

    it('returns the correct product among multiple products', async () => {
        const [p1, p2, p3] = await Promise.all([
            createProduct({ title: 'Product A' }),
            createProduct({ title: 'Product B' }),
            createProduct({ title: 'Product C' }),
        ]);

        const res = await request(app).get(`/api/products/${p2._id}`);

        expect(res.status).toBe(200);
        expect(res.body.product._id).toBe(p2._id.toString());
        expect(res.body.product.title).toBe('Product B');
    });
});
