/* global __ENV, __VU, __ITER */
/* eslint-disable camelcase */
import http from 'k6/http';
import {sleep, group, check} from 'k6';
import {Rate, Trend} from 'k6/metrics';
import {parseHTML} from 'k6/html';

const TTFB_home_page = new Trend('Load Home Page for guest', true);
const TTFB_product_search_page = new Trend('Load Product Search for guest', true);
const TTFB_product_detail_page = new Trend('Load Product Detail Page(PDP) for guest', true);
const TTFB_product_listing_page = new Trend('Load Product Listing Page(PLP) for guest', true);
const TTFB_cms_page = new Trend('Load About Page (CMS) for guest', true);

export const BASE_URL = `${__ENV.BASE_URL}`;
export const THRESHOLD_AVG = `${__ENV.THRESHOLD_AVG}`;

const checkFailureRate = new Rate('check_failure_rate');

const headersDefaults = {
    'upgrade-insecure-requests': '1',
    // eslint-disable-next-line max-len
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
    'accept': [
        'text/html',
        'application/xhtml+xml',
        'application/xml;q=0.9',
        'image/avif',
        'image/webp',
        'image/apng,*/*;q=0.8',
        'application/signed-exchange;v=b3;q=0.9'
    ].join(','),
    'accept-encoding': 'gzip, deflate',
    'accept-language': 'en,en-US;q=0.9'
};

function simulateUserInteractionDelay() {
    sleep(2 + Math.random(3));
}

function formatResult(res) {
    // eslint-disable-next-line max-len
    return `${String(res.status)} TTFB: ${res.timings.waiting} VU: ${__VU}  -  ITER: ${__ITER} Page title: ${parseHTML(res.body).find('head title').text()}`;
}

export const options = {
    thresholds: {
        'Load Home Page for guest': ['avg<' + THRESHOLD_AVG],
        'Load Product Search for guest': ['avg<' + THRESHOLD_AVG],
        'Load Product Detail Page(PDP) for guest': ['avg<' + THRESHOLD_AVG],
        'Load Product Listing Page(PLP) for guest': ['avg<' + THRESHOLD_AVG],
        'Load About Page (CMS) for guest': ['avg<' + THRESHOLD_AVG]
    },
    scenarios: {
        guest_user_test: {
            executor: 'constant-vus',
            vus: `${__ENV.VU}`,
            duration: `${__ENV.DURATION}`,
            tags: {test_type: 'website'},
            exec: 'default'
        }
    }
};

export default function() {
    /**
     *
     * Load Home Page
     *
     */
    group('Load Home Page for guest', function() {
        const res = http.get(BASE_URL + '/',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'Homepage sign in link present': r => r.body.indexOf('Register') !== -1
        });

        console.log('Home page opened with status code: ' + formatResult(res));

        TTFB_home_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Load Product Search Page
     *
     */
    group('Load Product Search Page for guest', function() {
        const res = http.get(BASE_URL + '/product/search?search=tag&_rand=0.8149753010063636',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'Search Results for "tag" is present': r => r.body.indexOf('Search Results for &quot;tag&quot;') !== -1
        });

        console.log('Product Search Page opened with status code: ' + formatResult(res));

        TTFB_product_search_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    /**
     *
     * Load Product Detail Page(PDP)
     *
     */
    group('Load Product Detail Page(PDP) for guest', function() {
        const res = http.get(BASE_URL + '/product/view/62',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'SKU TAG1 is present': r => r.body.indexOf('TAG1') !== -1
        });

        console.log('Product Detail Page(PDP) opened with status code: ' + formatResult(res));

        TTFB_product_detail_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    /**
     *
     * Load Product Listing Page(PLP)
     *
     */
    group('Load Product Listing Page(PLP) for guest', function() {
        const res = http.get(BASE_URL + '/navigation-root/products/by-category/industrial/lighting-products',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            '"Lighting  Products" category name is present': r => r.body.indexOf('Lighting  Products') !== -1
        });

        console.log('Product Listing Page(PLP) opened with status code: ' + formatResult(res));

        TTFB_product_listing_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    /**
     *
     * Load About Page (CMS)
     *
     */
    group('Load About Page (CMS) for guest', function() {
        const res = http.get(BASE_URL + '/about',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            '"We Are the Leading RV" title': r => r.body.indexOf('We Are the Leading RV') !== -1
        });

        console.log('Load About Page (CMS) opened with status code: ' + formatResult(res));

        TTFB_cms_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });
}
