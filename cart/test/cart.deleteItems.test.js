const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

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

describe('DELETE /api/cart/items/:productId', () => {
    const userId = generateObjectId();
    const productId = generateObjectId();
    const endpoint = `/api/cart/items/${productId}`;

    beforeEach(() => {
        CartModel.__reset();
    });

    test('successfully deletes item from cart', async () => {
        const token = signToken({ id: userId, role: 'user' });
        
        // First create a cart with an item
        const cart = new CartModel({
            user: userId,
            items: [{ productId, quantity: 2 }]
        });
        await cart.save();

        const res = await request(app)
            .delete(endpoint)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Item deleted from cart');
        expect(res.body.cart.items).toHaveLength(0);
    });

    test('returns 404 when cart not found', async () => {
        const token = signToken({ id: userId, role: 'user' });
        
        const res = await request(app)
            .delete(endpoint)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('cart not found');
    });

    test('returns 404 when item not found in cart', async () => {
        const token = signToken({ id: userId, role: 'user' });
        
        // Create a cart with different item
        const cart = new CartModel({
            user: userId,
            items: [{ productId: generateObjectId(), quantity: 1 }]
        });
        await cart.save();

        const res = await request(app)
            .delete(endpoint)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Item not found');
    });

    test('401 when no token provided', async () => {
        const res = await request(app)
            .delete(endpoint);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Unauthorized/);
    });

    test('403 when role not allowed', async () => {
        const token = signToken({ id: userId, role: 'admin' }); // role admin not in [user]
        const res = await request(app)
            .delete(endpoint)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('401 when token invalid', async () => {
        const res = await request(app)
            .delete(endpoint)
            .set('Authorization', 'Bearer invalid.token.here');
        expect(res.status).toBe(401);
    });
});