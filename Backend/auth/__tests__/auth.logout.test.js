const request = require("supertest");
const app = require("../src/app");
const userModel = require("../src/models/user.model");
const connectDb = require("../src/db/db");
const bcrypt = require("bcryptjs");

describe("GET /api/auth/logout", () => {

    beforeAll(async () => {
        await connectDb();
    });

    it('Clears the auth cookie and returns 200 when logged out', async () => {
        const password = "secret123!"
        const hash = await bcrypt.hash(password, 10);
        const user = await userModel.create({
            username: "logoutUser",
            email: "logout@user.com",
            password: hash,
            role: "user",
            fullName: {
                firstName: "Logout",
                lastName: "User"
            }
        });

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({
                email: "logout@user.com",
                password: "secret123!"
            });

        expect(loginRes.statusCode).toBe(200);
        const cookies = loginRes.headers['set-cookie'];
        expect(cookies).toBeDefined();

        const logoutRes = await request(app)
            .get("/api/auth/logout")
            .set("Cookie", cookies)

        expect(logoutRes.statusCode).toBe(200);
        const setCookie = logoutRes.headers['set-cookie'];
        const cookieStr = setCookie.join(';');
        expect(cookieStr).toMatch(/token=;/);
        expect(cookieStr.toLowerCase()).toMatch(/expires=/);
    });

    it('is idempotent, returns 200 even if no auth cookie is present', async () => {
        const res = await request(app).get("/api/auth/logout");
        expect(res.statusCode).toBe(200);
    });

});
