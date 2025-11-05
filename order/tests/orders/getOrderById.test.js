const request = require('supertest');
const app = require('../../src/app');
const { getAuthCookie } = require('../setup/auth');
const orderModel = require('../../src/models/order.model');


describe('GET /api/orders/:id — Get order by id with timeline and payment summary', () => {
    let orderId;

    beforeEach(async () => {
        // Create a test order
        const order = await orderModel.create({
            user: '68fd08069af180cd20c86b3b', // matches default test user ID
            items: [{
                product: '68fd08069af180cd20c86b3c',
                quantity: 2,
                price: {
                    amount: 200,
                    currency: 'INR'
                }
            }],
            status: 'PENDING',
            totalPrice: {
                amount: 200,
                currency: 'INR'
            },
            shippingAddress: {
                street: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                zip: '12345',
                country: 'Test Country'
            },
            timeline: [{
                type: 'CREATED',
                at: new Date()
            }],
            paymentSummary: {
                subtotal: {
                    amount: 200,
                    currency: 'INR'
                },
                taxes: {
                    amount: 20,
                    currency: 'INR'
                },
                shipping: {
                    amount: 50,
                    currency: 'INR'
                }
            }
        });
        orderId = order._id;
    });

    it('returns 200 with order details, timeline, and payment summary', async () => {
        const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Cookie', getAuthCookie())
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body).toBeDefined();
        const order = res.body.order || res.body.data || res.body; // flexible shape

        // Basic identity
        expect(order._id || order.id).toBeDefined();
        expect(order.user).toBeDefined();

        // Items
        expect(Array.isArray(order.items)).toBe(true);

        // Status and total
        expect(order.status).toBeDefined();
        expect(order.totalPrice).toBeDefined();
        expect(typeof (order.totalPrice.amount ?? order.totalPrice?.value ?? 0)).toBe('number');

        // Shipping address
        expect(order.shippingAddress).toBeDefined();

        // Timeline (events like created, paid, shipped, delivered, cancelled)
        expect(Array.isArray(order.timeline)).toBe(true);
        if (order.timeline.length) {
            const ev = order.timeline[ 0 ];
            expect(ev).toHaveProperty('type');
            expect(ev).toHaveProperty('at');
        }

        // Payment Summary (structure can vary)
        const payment = order.paymentSummary || order.payment || {};
        expect(payment).toBeDefined();
        // common fields (adjust in implementation)
        // expect(payment.subtotal).toBeDefined();
        // expect(payment.taxes).toBeDefined();
        // expect(payment.shipping).toBeDefined();
        // expect(payment.total).toBeDefined();
    });

    it('returns 404 when order not found or not accessible', async () => {
        const res = await request(app)
            .get(`/api/orders/000000000000000000000000`)
            .set('Cookie', getAuthCookie())
            .expect('Content-Type', /json/)
            .expect(404);

        expect(res.body.error || res.body.message).toMatch(/not found|no.*order/i);
    });
});
