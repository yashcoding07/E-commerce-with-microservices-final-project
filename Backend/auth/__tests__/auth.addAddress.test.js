const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const connectDB = require('../src/db/db');
const userModel = require('../src/models/user.model');

describe('POST /api/auth/user/me/address', () => {
    beforeAll(async () => {
        await connectDB();
    });

    async function seedUserAndLogin({ username = 'addr_user', email = 'addr@example.com', password = 'Secret123!' } = {}) {
        const hash = await bcrypt.hash(password, 10);
        const user = await userModel.create({
            username,
            email,
            password: hash,
            fullName: { firstName: 'Addr', lastName: 'User' },
            address: [],
        });

        const loginRes = await request(app).post('/api/auth/login').send({ email, password });
        expect(loginRes.status).toBe(200);
        const cookies = loginRes.headers['set-cookie'];
        expect(cookies).toBeDefined();

        return { user, cookies };
    }

    it('validates pincode and phone and returns 400 on invalid input', async () => {
        const { cookies } = await seedUserAndLogin({ username: 'adder1', email: 'adder1@example.com' });

        const res = await request(app)
            .post('/api/auth/user/me/address')
            .set('Cookie', cookies)
            .send({
                street: '12 Invalid Ave',
                city: 'Nowhere',
                state: 'NA',
                pincode: '12', // invalid
                country: 'US',
            });

        expect(res.status).toBe(400); // validation should fail
        expect(res.body.errors || res.body.message).toBeDefined();
    });

    it('adds an address and can set it as default', async () => {
        const { cookies } = await seedUserAndLogin({ username: 'adder2', email: 'adder2@example.com' });

        const res = await request(app)
            .post('/api/auth/user/me/address')
            .set('Cookie', cookies)
            .send({
                street: '1600 Amphitheatre Pkwy',
                city: 'Mountain View',
                state: 'CA',
                pincode: '94043',
                country: 'US',
                isDefault: true,
            });

        expect(res.status).toBe(200);
        expect(res.body.address).toBeDefined();
        const addr = res.body.address;
        expect(addr.street).toBe('1600 Amphitheatre Pkwy');
        // default marking can be communicated either by isDefault flag or separate default id
        expect(addr.isDefault === true || typeof res.body.defaultAddressId === 'string').toBe(true);
    });
});