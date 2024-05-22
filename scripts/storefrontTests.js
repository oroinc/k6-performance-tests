/* global __ENV, __VU, __ITER */
/* eslint-disable camelcase */
import http from 'k6/http';
import {sleep, group, check} from 'k6';
import {Rate, Trend} from 'k6/metrics';
import {parseHTML} from 'k6/html';
import {htmlReport} from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import {textSummary} from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

const TTFB_home_page = new Trend('load_home_page_guest_user', true);
const TTFB_home_page_logged_in = new Trend('load_home_page_logged_in_user', true);

const TTFB_product_search_page = new Trend('load_product_search_page_guest_user', true);
const TTFB_product_search_page_logged_in = new Trend('load_product_search_page_logged_in_user', true);

const TTFB_product_detail_page = new Trend('load_product_detail_page_guest_user', true);
const TTFB_product_detail_page_logged_in = new Trend('load_product_detail_page_logged_in_user', true);

const TTFB_product_listing_page = new Trend('load_product_listing_page_guest_user', true);
const TTFB_product_listing_page_logged_in = new Trend('load_product_listing_page_logged_in_user', true);

const TTFB_cms_page = new Trend('load_about_page_cms_guest_user', true);
const TTFB_login_page = new Trend('load_login_page', true);
const TTFB_authentication = new Trend('authentication_post_request', true);
const TTFB_create_sl_widget = new Trend('create_sl_widget', true);
const TTFB_create_sl_request = new Trend('create_sl_request_post_request', true);

const headersDefaults = {
    'upgrade-insecure-requests': '1',
    'user-agent': 'GoogleStackdriverMonitoring',
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

function formatResultShort(res) {
    return `${String(res.status)} TTFB: ${res.timings.waiting} VU: ${__VU}  -  ITER: ${__ITER}`;
}

function formatResult(res) {
    return `${formatResultShort(res)} Page title: ${parseHTML(res.body).find('head title').text()}`;
}

export const BASE_URL = `${__ENV.BASE_URL}`;
export const THRESHOLD_95 = `${__ENV.THRESHOLD_95}`;
export const USERNAME = `${__ENV.USERNAME}`;
export const PASSWORD = `${__ENV.PASSWORD}`;

const checkFailureRate = new Rate('check_failure_rate');

export const options = {
    thresholds: {
        'load_home_page_guest_user': ['p(95)<' + THRESHOLD_95],
        'load_home_page_logged_in_user': ['p(95)<' + THRESHOLD_95],
        'load_login_page': ['p(95)<' + THRESHOLD_95],
        'load_product_search_page_guest_user': ['p(95)<' + THRESHOLD_95],
        'load_product_search_page_logged_in_user': ['p(95)<' + THRESHOLD_95],
        'load_product_detail_page_guest_user': ['p(95)<' + THRESHOLD_95],
        'load_product_detail_page_logged_in_user': ['p(95)<' + THRESHOLD_95],
        'load_product_listing_page_guest_user': ['p(95)<' + THRESHOLD_95],
        'load_product_listing_page_logged_in_user': ['p(95)<' + THRESHOLD_95],
        'load_about_page_cms_guest_user': ['p(95)<' + THRESHOLD_95],
        'authentication_post_request': ['p(95)<' + THRESHOLD_95],
        'create_sl_widget': ['p(95)<' + THRESHOLD_95],
        'create_sl_request_post_request': ['p(95)<' + THRESHOLD_95]
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
    let csrfToken;
    let soppingListTypeToken;
    let shoppingListID;

    function getCSRFToken(BASE_URL) {
        /**
         *
         * Open login page to get _csrf_token
         *
         */
        const res = http.get(BASE_URL + '/customer/user/login',
            {
                headers: Object.assign({}, headersDefaults, {
                    referer: BASE_URL
                })
            }
        );
        /**
         *
         * Get _csrf_token
         *
         */
        const csrfToken = parseHTML(res.body).find('input[name=\'_csrf_token\']').attr('value');
        // eslint-disable-next-line max-len
        console.log(`_csrf_token: ${csrfToken} VU: ${__VU}  -  ITER: ${__ITER} Page title: ${parseHTML(res.body).find('head title').text()}`);

        return csrfToken;
    }
    group('Get CSRF Token', function() {
        csrfToken = getCSRFToken(BASE_URL);
    });

    /**
     *
     * Load Home Page (guest user)
     *
     */
    group('Load Home Page (guest user)', function() {
        const res = http.get(BASE_URL + '/',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'Homepage sign in link present': r => r.body.indexOf('Sign Up') !== -1
        });

        console.log('Home page (guest user) opened with status code: ' + formatResult(res));

        TTFB_home_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Load Product Search Page (guest user)
     *
     */
    group('Load Product Search Page (guest user)', function() {
        const res = http.get(BASE_URL + '/product/search?search=tag&_rand=0.8149753010063636',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'Search Results (guest user) for "tag" is present':
                r => r.body.indexOf('Search Results for &quot;tag&quot;') !== -1
        });

        console.log('Product Search Page (guest user) opened with status code: ' + formatResult(res));

        TTFB_product_search_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Load Product Detail Page(PDP) (guest user)
     *
     */
    group('Load Product Detail Page(PDP) (guest user)', function() {
        const res = http.get(BASE_URL + '/product/view/12',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'SKU 2TK59 is present': r => r.body.indexOf('2TK59') !== -1
        });

        console.log('Product Detail Page(PDP) (guest user) opened with status code: ' + formatResult(res));

        TTFB_product_detail_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Load Product Listing Page(PLP) (guest user)
     *
     */
    group('Load Product Listing Page(PLP) (guest user)', function() {
        const res = http.get(BASE_URL + '/navigation-root/products/by-category/industrial/lighting-products',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            '"Lighting  Products" category name(guest user) is present':
                r => r.body.indexOf('Lighting  Products') !== -1
        });

        console.log('Product Listing Page(PLP)(guest user) opened with status code: ' + formatResult(res));

        TTFB_product_listing_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Load About Page (CMS)
     *
     */
    group('Load About Page (CMS) (guest user)', function() {
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

    simulateUserInteractionDelay();

    /**
     *
     * Go to customer user login page
     *
     */
    group('Load customer user login page', function() {
        const res = http.get(BASE_URL + '/customer/user/login',
            {
                headers: Object.assign({}, headersDefaults, {
                    referer: BASE_URL
                })
            }
        );

        simulateUserInteractionDelay();

        const checkRes = check(res, {
            'status code is 200': res => res.status === 200,
            'Login form is displayed ': res => res.body.indexOf('Remember Me') !== -1
        });
        console.log('Login page opened with status code: ' + formatResult(res));
        TTFB_login_page.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Authentication
     *
     */
    group('Authentication(POST request)', function() {
        const res = http.post(BASE_URL + '/customer/user/login-check',
            {
                _username: USERNAME,
                _password: PASSWORD,
                _remember_me: 'on',
                _target_path: '',
                _failure_path: '',
                _csrf_token: csrfToken
            },
            {
                tags: {name: '/customer/user/login-check'},
                headers: Object.assign({}, headersDefaults, {
                    'accept': 'application/json, text/javascript, *!/!*; q=0.01',
                    'accept-encoding': 'gzip, deflate, br',
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'origin': BASE_URL,
                    'referer': BASE_URL + '/customer/user/login',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-csrf-header': csrfToken,
                    'x-oro-hash-navigation': 'true',
                    'x-requested-with': 'XMLHttpRequest'
                })
            }
        );
        const checkRes = check(res, {
            'status code is 200': res => res.status === 200
        });
        console.log('Authentication request finished with status code: ' + formatResultShort(res));
        TTFB_authentication.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /**
     *
     * Go back to the homepage to verify user is logged in
     *
     */
    group('Load homepage page (logged in user)', function() {
        const res = http.get(BASE_URL + '/',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        simulateUserInteractionDelay();

        check(res, {
            'status code is 200': res => res.status === 200,
            '"Amanda Cole" text is present ': res => res.body.indexOf('Amanda Cole') !== -1
        });

        TTFB_home_page_logged_in.add(res.timings.waiting, {ttfbURL: res.url});
    });

    /**
     *
     * Create SL Widget
     *
     */
    group('Create SL Widget', function() {
        // eslint-disable-next-line max-len
        const res = http.get(BASE_URL + '/customer/shoppinglist/create?createOnly=true&_widgetContainer=dialog&_wid=ec4ed86d-8886-4410-a039-d726985cc0ca&_widgetInit=1',
            {
                headers: Object.assign({}, headersDefaults, {
                    'accept': '*/*',
                    'x-requested-with': 'XMLHttpRequest',
                    'x-csrf-header': csrfToken
                })
            }
        );

        simulateUserInteractionDelay();

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            '"Create New Shopping List" dialog title is present': r => r.body.indexOf('Shopping List Name') !== -1
        });

        console.log('Create SL Dialog opened with status code: ' + formatResultShort(res));

        TTFB_create_sl_widget.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);

        soppingListTypeToken = parseHTML(res.body).find('input[name=\'oro_shopping_list_type[_token]\']').attr('value');
        console.log('SoppingListTypeToken : ' + soppingListTypeToken);

        return soppingListTypeToken;
    });

    /**
     *
     * Create SL Request
     *
     */
    group('Create SL Request(POST request)', function() {
        const res = http.post(BASE_URL + '/customer/shoppinglist/create?',
            {
                '_wid': 'ec4ed86d-8886-4410-a039-d726985cc0ca',
                '_widgetContainer': 'dialog',
                '_widgetInit': '0',
                'oro_shopping_list_type%5B_token%5D': soppingListTypeToken,
                'oro_shopping_list_type%5Blabel%5D': 'SL for k6'
            },
            {
                headers: {
                    'accept': '*/*',
                    'x-requested-with': 'XMLHttpRequest',
                    'x-csrf-header': csrfToken,
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'origin': BASE_URL
                }
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'SL was created successfully message appears: ': r => r.body.indexOf('was created successfully') !== -1
        });

        console.log('Create SL request finished with status code: ' + formatResultShort(res));

        TTFB_create_sl_request.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);

        simulateUserInteractionDelay();
    });

    /**
     *
     * Load Product Search Page (logged in user)
     *
     */
    group('Load Product Search Page (logged in user)', function() {
        const res = http.get(BASE_URL + '/product/search?search=tag&_rand=0.8149753010063636',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'Search Results (logged in user) for "tag" is present':
                r => r.body.indexOf('Search Results for &quot;tag&quot;') !== -1
        });

        console.log('Product Search Page (logged in user) opened with status code: ' + formatResult(res));

        TTFB_product_search_page_logged_in.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    /**
     *
     * Load Product Detail Page(PDP) (logged in user)
     *
     */
    group('Load Product Detail Page(PDP) (logged in user)', function() {
        const res = http.get(BASE_URL + '/product/view/12',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            'SKU 2TK59 is present': r => r.body.indexOf('2TK59') !== -1
        });

        console.log('Product Detail Page(PDP) (logged in user) opened with status code: ' + formatResult(res));

        TTFB_product_detail_page_logged_in.add(res.timings.waiting, {ttfbURL: res.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    /**
     *
     * Load Product Listing Page(PLP) (logged in user)
     *
     */
    group('Load Product Listing Page(PLP) (logged in user)', function() {
        const res = http.get(BASE_URL + '/navigation-root/products/by-category/industrial/lighting-products',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        const checkRes = check(res, {
            'status code is 200': r => r.status === 200,
            '"Lighting  Products" category name is present': r => r.body.indexOf('Lighting  Products') !== -1
        });

        console.log('Product Listing Page(PLP) (logged in user) opened with status code: ' + formatResult(res));

        TTFB_product_listing_page_logged_in.add(res.timings.waiting, {ttfbURL: res.url});

        shoppingListID = parseHTML(res.body)
            .find('input[name=\'main_menu_shopping_lists_dropdown_item-radio\']').attr('value');
        console.log('SoppingList ID Extractor: ' + shoppingListID);

        // Record check failures
        checkFailureRate.add(!checkRes);

        return shoppingListID;
    });
}

export function handleSummary(data) {
    console.log('Preparing the end-of-test summary report');
    return {
        'stdout': textSummary(data, {indent: ' ', enableColors: true}),
        'summary.html': htmlReport(data)
    };
}
