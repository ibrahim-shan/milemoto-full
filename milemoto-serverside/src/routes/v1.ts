import { Router } from 'express';
import { auth } from './auth/index.js';
import { health } from './health.route.js';
import { setup } from './setup.route.js';
import { webhooks } from './webhooks/index.js';
import { cart } from './cart.route.js';
import { storefront } from './storefront.route.js';
import { locations } from './locations.route.js';
import { checkout } from './checkout.route.js';
import { orders } from './orders.route.js';
import { wishlist } from './wishlist.route.js';
import { reviews } from './reviews.route.js';

import { admin } from './admin.route.js';
import { ensureInstalled } from '../middleware/ensureInstalled.js';
import { adminLimiter } from '../middleware/rateLimit.js';

export const apiV1 = Router();

apiV1.use('/health', health);

apiV1.use('/auth', auth);
apiV1.use('/setup', setup);
apiV1.use('/webhooks', webhooks);
apiV1.use('/cart', cart);
apiV1.use('/storefront', storefront);
apiV1.use('/locations', locations);
apiV1.use('/checkout', checkout);
apiV1.use('/orders', orders);
apiV1.use('/wishlist', wishlist);
apiV1.use('/reviews', reviews);

apiV1.use('/admin', ensureInstalled, adminLimiter, admin);
