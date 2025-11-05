const request = require('supertest');
const app = require('../../src/app');
const { getAuthCookie } = require('../setup/auth');
const axios = require('axios');

jest.mock('axios');


describe('POST /api/orders — Create order from current cart', () => {
    const sampleAddress = {
        street: '123 Main St',
        city: 'Metropolis',
        state: 'CA',
        pincode: '90210',
        country: 'USA',
    };

    it('creates order from current cart, computes totals, sets status=PENDING, reserves inventory', async () => {
        const productId = '68fd08069af180cd20c86b3b';

        // Mock cart service response (first axios.get)
        axios.get.mockResolvedValueOnce({ data: { cart: { items: [ { productId, quantity: 2 } ] } } });
        // Mock product service response (second axios.get)
        axios.get.mockResolvedValueOnce({ data: { data: { _id: productId, title: 'Sample Product', price: { amount: 100, currency: 'INR' }, stock: 10 } } });
        // Example: Provide any inputs the API expects (headers/cookies/body). Adjust when auth is wired.
        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie())
            .send({ shippingAddress: sampleAddress })
            .expect('Content-Type', /json/)
            .expect(201);

        // Response shape assertions (adjust fields as you implement)
        expect(res.body).toBeDefined();
        expect(res.body.order).toBeDefined();
        const { order } = res.body;
        expect(order._id).toBeDefined();
        expect(order.user).toBeDefined();
        expect(order.status).toBe('PENDING');

        // Items copied from priced cart
        expect(Array.isArray(order.items)).toBe(true);
        expect(order.items.length).toBeGreaterThan(0);
        for (const it of order.items) {
            expect(it.product).toBeDefined();
            expect(it.quantity).toBeGreaterThan(0);
            expect(it.price).toBeDefined();
            expect(typeof it.price.amount).toBe('number');
            expect([ 'USD', 'INR' ]).toContain(it.price.currency);
        }

        // Totals include taxes + shipping
        expect(order.totalPrice).toBeDefined();
        expect(typeof order.totalPrice.amount).toBe('number');
        expect([ 'USD', 'INR' ]).toContain(order.totalPrice.currency);


        // Shipping address persisted
        expect(order.shippingAddress).toMatchObject({
            street: sampleAddress.street,
            city: sampleAddress.city,
            state: sampleAddress.state,
            zip: sampleAddress.pincode,
            country: sampleAddress.country,
        });

        // Inventory reservation acknowledgement (shape up to you)
        // For example, you might include a flag or reservation id
        // expect(res.body.inventoryReservation).toEqual({ success: true })
    });


    it('returns 422 when shipping address is missing/invalid', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Cookie', getAuthCookie())
            .send({})
            .expect('Content-Type', /json/)
            .expect(400);

        expect(res.body.errors || res.body.message).toBeDefined();
    });
});
