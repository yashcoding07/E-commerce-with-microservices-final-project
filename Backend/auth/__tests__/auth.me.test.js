const request = require("supertest");
const app = require("../src/app");
const connectDb = require("../src/db/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../src/models/user.model");

describe("GET /api/auth/me", () => {

    beforeAll(async () => {
        await connectDb();
    });

    it('should return 401 if user is not authenticated', async () => {
        const response = await request(app).get("/api/auth/me");
        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe("Unauthorized");
    });

    it("should return invalid token with status code 401", async () => {
        const token = jwt.sign({id: '000000000000'}, 'wrongsecret123!')
        const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`token=${token}`])

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("Invalid token");
    });

    it('should return 200 with user if the user is authenticated', async () => {
        const password = "secret123!"
        const hash = await bcrypt.hash(password, 10);
        const user = await userModel.create({
            username: "test",
            email: "test@gmail.com",
            password: hash,
            fullName: {
                firstName: "John",
                lastName: "Doe"
            }
        });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@gmail.com",
                password: "secret123!"
            })
            expect(loginResponse.statusCode).toBe(200);
            const setCookie = loginResponse.headers["set-cookie"];
            expect(setCookie).toBeDefined();

            const response = await request(app)
                .get("/api/auth/me")
                .set("Cookie", setCookie);

                expect(response.statusCode).toBe(200)
                expect(response.body.user).toBeDefined();
                expect(response.body.user.id).toBe(user._id.toString());
                expect(response.body.user.email).toBe(user.email);
                expect(response.body.user.username).toBe(user.username);
    });
});