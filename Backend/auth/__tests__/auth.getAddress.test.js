const request = require("supertest");
const app = require("../src/app");
const connectDb = require("../src/db/db");
const bcrypt = require("bcryptjs");
const userModel = require("../src/models/user.model");

describe("GET /api/auth/user/me/address", () => {
    beforeAll(async () => {
        await connectDb();
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

    it('requires authentication send 401 without cookies', async () => {
        const res = await request(app).get("/api/auth/user/me/address");
        expect(res.statusCode).toBe(401);
    });

    it('returns a lists of addresses and indicates a default', async () => {
        const { user, cookies } = await seedUserAndLogin({ username: 'lister', email: 'lister@example.com' });
        user.address.push(
            { street: '221B Baker St', city: 'London', state: 'LDN', zip: 'NW16XE', country: 'UK', isDefault: true },
            { street: '742 Evergreen Terrace', city: 'Springfield', state: 'SP', zip: '49007', country: 'USA' }
        );
        await user.save();

        const res = await request(app)
            .get("/api/auth/user/me/address")
            .set("Cookie", cookies);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.address)).toBe(true);
        expect(res.body.address.length).toBe(2);
        expect('defaultAddressID' in res.body || res.body.address.some(a => a.isDefault == true)).toBe(true);
    });
});
