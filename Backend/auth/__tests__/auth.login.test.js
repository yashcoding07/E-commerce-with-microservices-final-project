const request = require("supertest");
const app = require("../src/app");
const connectDb = require("../src/db/db");
const bcryptjs = require("bcryptjs");
const userModel = require("../src/models/user.model");

describe('POST /api/auth/login', () => {

    beforeAll(async () => {
        await connectDb();
    });

    it('logs in with correct credentials and returns 200 with user and sets cookie', async () => {
        const password = "secret123!"
        const hashPassword = await bcryptjs.hash(password, 10);
        const user = await userModel.create({
            username: 'jane_doe',
            email: 'jane@example.com',
            password: hashPassword,
            fullName: { firstName: 'Jane', lastName: 'Doe' },
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: password })

        expect(res.statusCode).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(user.email);

        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
        expect(setCookie.join(";")).toMatch(/token=/);
    });

    it('rejects wrong password with 401', async () => {
        const password = 'Secret123!';
        const hashPassword = await bcryptjs.hash(password, 10);
        await userModel.create({
            username: 'jack_smith',
            email: 'jack@example.com',
            password: hashPassword,
            fullName: { firstName: 'Jack', lastName: 'Smith' },
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'jack@example.com', password: 'WrongPass1!' });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Invalid credentials');
    });

    it('validates missing fields with 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'jack@example.com' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message[0].msg).toBe('Password is required');
    });
});