const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const axios = require('axios');

jest.mock('axios');

jest.mock('../src/models/cart.model.js', () => {
    function mockGenerateObjectId() {
        return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    const carts = new Map();
    class CartMock {
        constructor({ user, items }) {
            this._id = mockGenerateObjectId();
            this.user = user;
            this.items = items || [];
        }
        static async findOne(query) {
            return carts.get(query.user) || null;
        }
        static async findById(id) {
            for (const v of carts.values()) {
                if (!v) continue;
                if (v._id && v._id.toString() === id.toString()) return v;
            }
            return null;
        }
        async save() {
            carts.set(this.user, this);
            return this;
        }
    }
    CartMock.__reset = () => carts.clear();
    return CartMock;
});

const CartModel = require('../src/models/cart.model.js');

function generateObjectId() {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const postEndpoint = '/api/cart/items';
const patchBase = '/api/cart/items';

describe('PATCH /api/cart/items/:productId', () => {
    const userId = generateObjectId();
    const existingProductId = generateObjectId();
    const otherProductId = generateObjectId();

    beforeEach(() => {
        CartModel.__reset();
        if (axios.get && axios.get.mockReset) axios.get.mockReset();
    });

    test('updates quantity of existing item', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        // create cart + item
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        await request(app)
            .post(postEndpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: existingProductId, quantity: 2 });

        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 5 });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Item quantity updated successfully');
        expect(res.body.cart.items[ 0 ]).toMatchObject({ productId: existingProductId, quantity: 5 });
    });

    test('404 when cart not found', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        // product service should respond so controller can continue to cart lookup
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 3 });
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Cart not found');
    });

    test('404 when item not in cart', async () => {
        const token = signToken({ _id: userId, role: 'user' });

        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        await request(app)
            .post(postEndpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: existingProductId, quantity: 1 });

        // the subsequent PATCH also calls product service
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });

        const res = await request(app)
            .patch(`${patchBase}/${otherProductId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 4 });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Item not found in cart');
    });

    test('validation error invalid productId param', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        const res = await request(app)
            .patch(`${patchBase}/not-a-valid-id`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 2 });
        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    test('validation error invalid qty', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        await request(app)
            .post(postEndpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: existingProductId, quantity: 1 });

        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 0 });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    test('401 when no token', async () => {
        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .send({ quantity: 2 });
        expect(res.status).toBe(401);
    });

    test('returns 400 when requested quantity exceeds product stock on update', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        // create cart + item with stock 5
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 5 } } });
        await request(app)
            .post(postEndpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: existingProductId, quantity: 2 });

        // request update to quantity 10 which exceeds stock
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 5 } } });
        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 10 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Requested quantity exceeds available stock');
    });

    test('403 when role not allowed', async () => {
        const token = signToken({ _id: userId, role: 'admin' });
        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 2 });
        expect(res.status).toBe(403);
    });

    test('401 when token invalid', async () => {
        const res = await request(app)
            .patch(`${patchBase}/${existingProductId}`)
            .set('Authorization', 'Bearer invalid.token.here')
            .send({ quantity: 2 });
        expect(res.status).toBe(401);
    });
});