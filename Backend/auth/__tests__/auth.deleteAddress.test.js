const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/db/db');
const userModel = require('../src/models/user.model');

describe('DELETE /api/auth/user/me/address/:addressId', () => {

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
    };

    it('removes an address and returns 200 and updates list', async () => {
        const { user, cookies } = await seedUserAndLogin({ username: 'deleter', email: 'deleter@example.com' });

        user.address.push(
            { street: 'A St', city: 'X', state: 'X', zip: '11111', country: 'US' },
            { street: 'B St', city: 'Y', state: 'Y', zip: '22222', country: 'US' }
        );
        await user.save();

        const idToDelete = user.address[0]._id.toString();

        const res = await request(app)
            .delete(`/api/auth/user/me/address/${idToDelete}`)
            .set('Cookie', cookies);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.address)).toBe(true);
        expect(res.body.address.find(a => a._id === idToDelete)).toBeUndefined();
    });

    it('returns 404 when address not found', async () => {
        const { user, cookies } = await seedUserAndLogin({ username: 'notfound', email: 'notfound@example.com' });

        const res = await request(app)
            .delete('/api/auth/user/me/address/60d5ec49f1c2d3a4b5c6d7e8')
            .set('Cookie', cookies);

        expect(res.status).toBe(404);
    });
});