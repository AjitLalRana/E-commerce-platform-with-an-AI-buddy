const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const axios = require('axios');

jest.mock('axios');

// Mock the cart model
jest.mock('../src/models/cart.model.js', () => {
    // helper inside factory to avoid out-of-scope reference restriction
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

const endpoint = '/api/cart/items';

describe('POST /api/cart/items', () => {
    const userId = generateObjectId();
    const productId = generateObjectId();

    beforeEach(() => {
        CartModel.__reset();
        if (axios.get && axios.get.mockReset) axios.get.mockReset();
    });

    test('creates new cart and adds first item', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        // product service returns sufficient stock
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 2 });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Item added to cart');
        expect(res.body.cart).toBeDefined();
        expect(res.body.cart.items).toHaveLength(1);
        expect(res.body.cart.items[ 0 ]).toMatchObject({ productId, quantity: 2 });
    });

    test('increments quantity when item already exists', async () => {
        const token = signToken({ _id: userId, role: 'user' });

        // First add
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 2 });

        // Second add
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 10 } } });
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 3 });

        expect(res.status).toBe(200);
        expect(res.body.cart.items).toHaveLength(1);
        expect(res.body.cart.items[ 0 ]).toMatchObject({ productId, quantity: 5 });
    });

    test('validation error for invalid productId', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: 'invalid-id', quantity: 1 });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        const messages = res.body.errors.map(e => e.msg);
        expect(messages).toContain('Invalid Product ID format');
    });

    test('validation error for non-positive qty', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId: productId, quantity: 0 });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        const messages = res.body.errors.map(e => e.msg);
        expect(messages).toContain('Quantity must be a positive integer');
    });

    test('401 when no token provided', async () => {
        const res = await request(app)
            .post(endpoint)
            .send({ productId, quantity: 1 });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Unauthorized/);
    });

    test('returns 400 when requested quantity exceeds product stock', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        // product has only 3 in stock
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 3 } } });
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 5 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Requested quantity exceeds available stock');
    });

    test('returns 400 when incrementing existing item would exceed stock', async () => {
        const token = signToken({ _id: userId, role: 'user' });
        // first add with stock 5
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 5 } } });
        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 4 });

        // second add would push total to 6 > stock 5
        axios.get.mockResolvedValueOnce({ data: { data: { stock: 5 } } });
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 2 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Requested quantity exceeds available stock');
    });

    test('403 when role not allowed', async () => {
        const token = signToken({ _id: userId, role: 'admin' }); // role admin not in [user]
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 1 });
        expect(res.status).toBe(403);
    });

    test('401 when token invalid', async () => {
        const res = await request(app)
            .post(endpoint)
            .set('Authorization', 'Bearer invalid.token.here')
            .send({ productId, quantity: 1 });
        expect(res.status).toBe(401);
    });
});