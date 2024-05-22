/* global __ENV, __VU, __ITER */
/* eslint-disable camelcase */
import http from 'k6/http';
import {check, group, sleep} from 'k6';
import {Rate, Trend} from "k6/metrics";
import {parseHTML} from 'k6/html';
import {FormData} from 'https://jslib.k6.io/formdata/0.0.2/index.js'
import {htmlReport} from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import {textSummary} from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

let TTFB_home_page = new Trend("load_home_page_guest_user", true);
let TTFB_login_page = new Trend("load_login_page", true);
let TTFB_sl_page = new Trend("load_shopping_list_page", true);
let TTFB_start_from_shoppinglist = new Trend("load_start_checkout_from_shopping_list_transition", true);
let TTFB_billing_information_checkout_page = new Trend("load_billing_information_step_page", true);
let TTFB_get_country_region = new Trend("load_get_US_country_regions_request", true);
let TTFB_shipping_information_checkout_page = new Trend("load_shipping_information_step_page", true);
let TTFB_continue_to_shipping_method_transition = new Trend("load_shipping_method_step_page", true);
let TTFB_continue_to_payment_transition = new Trend("load_payment_method_step_page", true);
let TTFB_continue_to_order_review_transition = new Trend("load_order_review_page", true);
let TTFB_place_order_transition = new Trend("load_place_order_transition", true);
let TTFB_thank_you_page = new Trend("load_thank_you_page", true);

let checkFailureRate = new Rate("check_failure_rate");

export const BASE_URL = `${__ENV.BASE_URL}`
export const SL_ID = `${__ENV.SL_ID}`;
export const USERNAME = `${__ENV.USERNAME}`;
export const PASSWORD = `${__ENV.PASSWORD}`;
export const SHIPPING_METHOD = `${__ENV.SHIPPING_METHOD}`;
export const PAYMENT_METHOD = `${__ENV.PAYMENT_METHOD}`;
export const THRESHOLD_95 = `${__ENV.THRESHOLD_95}`;

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

export let options = {
    thresholds: {
        'load_home_page_guest_user': ['p(95)<' + THRESHOLD_95],
        'load_login_page': ['p(95)<' + THRESHOLD_95],
        'load_shopping_list_page': ['p(95)<' + THRESHOLD_95],
        'load_start_checkout_from_shopping_list_transition': ['p(95)<' + THRESHOLD_95],
        'load_billing_information_step_page': ['p(95)<' + THRESHOLD_95],
        'load_get_US_country_regions_request': ['p(95)<' + THRESHOLD_95],
        'load_shipping_information_step_page': ['p(95)<' + THRESHOLD_95],
        'load_shipping_method_step_page': ['p(95)<' + THRESHOLD_95],
        'load_payment_method_step_page': ['p(95)<' + THRESHOLD_95],
        'load_order_review_page': ['p(95)<' + THRESHOLD_95],
        'load_place_order_transition': ['p(95)<' + THRESHOLD_95],
        'load_thank_you_page': ['p(95)<' + THRESHOLD_95]
    },
    scenarios: {
        checkout_test: {
            executor: 'constant-vus',
            vus: `${__ENV.VU}`,
            duration: `${__ENV.DURATION}`,
            tags: {test_type: 'website'},
            exec: 'default',
        },
    },
};

function getOroWorkflowTransitionToken(response) {
    return parseHTML(response.body).find("input[name='oro_workflow_transition[_token]']").attr('value');
}

function getOroWorkflowTransitionStateToken(response) {
    return parseHTML(response.body).find("input[name='oro_workflow_transition[state_token]']").attr('value');
}

function simulateUserInteractionDelay() {
    sleep(2 + Math.random(3));
}

function formatResultShort(response) {
    return `${String(response.status)}; TTFB: ${response.timings.waiting}; VU: ${__VU}  -  ITER: ${__ITER}; `;
}

function formatResult(response) {
    return formatResultShort(response) + `Page title: ${parseHTML(response.body).find('head title').text()}`;
}

export function getCSRFToken(BASE_URL) {
    /*
    /
    / Open login page to get _csrf_token
    /
    */
    // eslint-disable-next-line max-len
    let res = http.get(BASE_URL + '/customer/user/login',
        {
            headers: {
                accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                referer: BASE_URL,
                "upgrade-insecure-requests": "1",
                "user-agent":
                    "GoogleStackdriverMonitoring",
            },
        },
    );

    /*
     *
     * Get _csrf_token
     *
    */
    const csrfToken = parseHTML(res.body).find("input[name='_csrf_token']").attr('value');
    console.log("_csrf_token: " + csrfToken + formatResultShort(res));

    return csrfToken;
}

export default function () {
    let formData, response, oro_workflow_transition_token, oro_workflow_transition_state_token, checkoutId
    const csrfToken = getCSRFToken(BASE_URL);

    /*
     *
     * Open Home Page
     *
    */
    group("open home page", function () {

        response = http.get(BASE_URL + '/',
            {
                headers: Object.assign({}, headersDefaults)
            }
        );

        let checkRes = check(response, {
            'status code is 200': response => response.status === 200,
            'Homepage sign in link present': response => response.body.indexOf('Sign Up') !== -1
        });

        console.log('Home page opened with status code: ' + formatResult(response));
        TTFB_home_page.add(response.timings.waiting, {ttfbURL: response.url});

        // Record check failures
        checkFailureRate.add(!checkRes);
    });

    simulateUserInteractionDelay();

    /*
    *
    * Go to customer user login page and sign in
    *
    */
    group("go to customer user login page and sign in", function () {
        // eslint-disable-next-line max-len
        response = http.get(BASE_URL + '/customer/user/login', {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                referer: BASE_URL,
                "upgrade-insecure-requests": "1",
                "user-agent": "GoogleStackdriverMonitoring",
            },
        },);

        simulateUserInteractionDelay();

        let checkRes = check(response, {
            'status code is 200': (response) => response.status === 200,
            'Login form is displayed ': (response) => response.body.indexOf("Remember Me") !== -1
        });
        console.log('Login page opened with status code: ' + formatResult(response));
        TTFB_login_page.add(response.timings.waiting, {ttfbURL: response.url});

        // Record check failures
        checkFailureRate.add(!checkRes);

        response = http.post(BASE_URL + '/customer/user/login-check', {
            _username: USERNAME,
            _password: PASSWORD,
            _remember_me: "on",
            _target_path: "",
            _failure_path: "",
            _csrf_token: csrfToken,
        }, {
            tags: {name: '/customer/user/login-check'}, headers: {
                accept: "application/json, text/javascript, *!/!*; q=0.01",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en,en-US;q=0.9",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                origin: BASE_URL,
                referer: BASE_URL + "/customer/user/login",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "GoogleStackdriverMonitoring",
                "x-csrf-header": csrfToken,
                "x-oro-hash-navigation": "true",
                "x-requested-with": "XMLHttpRequest",
            },
        },);

        simulateUserInteractionDelay();

        /*
         *
         * Go back to the homepage to check page title
         *
        */
        // eslint-disable-next-line max-len
        response = http.get(BASE_URL + '/', {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                referer: BASE_URL,
                "upgrade-insecure-requests": "1",
                "user-agent": "GoogleStackdriverMonitoring",
            },
        });

        check(response, {
            'status code is 200': (response) => response.status === 200,
            '"Amanda Cole" text is present ': (response) => response.body.indexOf("Amanda Cole") !== -1
        });

    });

    /*
    *
    * Open SL with specific ID and start the checkout
    *
    */
    group("open SL with specific ID and start the checkout", function () {

        let response = http.get(BASE_URL + '/customer/shoppinglist/update/' + SL_ID);
        let checkRes = check(response, {
            'status code is 200': (response) => response.status === 200
        });

        console.log('SL with id: ' + SL_ID + ' opened with status code: ' + formatResult(response));
        TTFB_sl_page.add(response.timings.waiting, {ttfbURL: response.url});

        // Record check failures
        checkFailureRate.add(!checkRes);

        // eslint-disable-next-line max-len
        response = http.post(BASE_URL
            + '/api/rest/latest/workflow/start/b2b_flow_checkout/start_from_shoppinglist?entityClass=Oro%5CBundle%5CShoppingListBundle%5CEntity%5CShoppingList&entityId='
            + SL_ID
            + '&route=oro_shopping_list_frontend_update',
            null,
            {
                tags: {name: '/api/rest/latest/workflow/start/b2b_flow_checkout/start_from_shoppinglist'},
                headers: {
                    accept: "application/json, text/javascript, *!/!*; q=0.01",
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "en,en-US;q=0.9",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    origin: BASE_URL,
                    referer: BASE_URL + '/customer/shoppinglist/update/' + SL_ID,
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "user-agent":
                        "GoogleStackdriverMonitoring",
                    "x-csrf-header": csrfToken,
                    "x-oro-hash-navigation": "true",
                    "x-requested-with": "XMLHttpRequest",
                },
            },
        );

        check(response, {
            'status code is 200': (response) => response.status === 200
        });

        console.log("start_from_shoppinglist status code: " + formatResultShort(response));

        TTFB_start_from_shoppinglist.add(response.timings.waiting, {ttfbURL: response.url});

        // Get Checkout_ID
        checkoutId = response.json().workflowItem.entity_id;
        console.log("Checkout ID is: " + checkoutId);
    });

    simulateUserInteractionDelay();

    /*
     *
     * Go to Billing information step page. Implemented for cases when user is agree with Terms And Conditions
     *
    */
    group('billing information step page', function () {
        response = http.get(BASE_URL + '/customer/checkout/' + checkoutId + '?_rand=0.7609077501757973', {
            headers: {
                'upgrade-insecure-requests': '1',
            },
        })

        check(response, {
            'status code is 200': (response) => response.status === 200,
            'Billing information page is opened': (response) => parseHTML(response.body)
                .find('head title')
                .text()
                .indexOf('Billing Information - Checkout') !== -1
        });

        console.log("Billing information step opened with status code: " + formatResult(response));
        TTFB_billing_information_checkout_page.add(response.timings.waiting, {ttfbURL: response.url});

        oro_workflow_transition_token = getOroWorkflowTransitionToken(response);
        oro_workflow_transition_state_token = getOroWorkflowTransitionStateToken(response);

    })

    /*
    *
    * Go to Shipping information step page.
    *
    */
    group("shipping information step page", function () {

        response = http.get(BASE_URL + '/api/rest/latest/country/regions/US', {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                'cache-control': 'no-cache, no-store',
                'x-csrf-header': csrfToken,
                'x-requested-with': 'XMLHttpRequest',
            },
        })

        check(response, {
            '/api/rest/latest/country/regions/US status code is 200': (response) => response.status === 200
        });

        TTFB_get_country_region.add(response.timings.waiting, {ttfbURL: response.url});

        formData = new FormData()
        formData.boundary = '----WebKitFormBoundaryU3X95gdqVZCAr4Zf'
        formData.append(
            'oro_workflow_transition[_token]',
            oro_workflow_transition_token
        )
        formData.append('oro_workflow_transition[billing_address][customerAddress]', '0')
        formData.append('oro_workflow_transition[email]', 'rkukla+a@oroinc.com')
        formData.append('oro_workflow_transition[billing_address][label]', 'Custom order')
        formData.append('oro_workflow_transition[billing_address][namePrefix]', '')
        formData.append('oro_workflow_transition[billing_address][firstName]', 'Amanda')
        formData.append('oro_workflow_transition[billing_address][middleName]', '')
        formData.append('oro_workflow_transition[billing_address][lastName]', 'Cole')
        formData.append('oro_workflow_transition[billing_address][nameSuffix]', '')
        formData.append('oro_workflow_transition[billing_address][organization]', 'Oro')
        formData.append('oro_workflow_transition[billing_address][phone]', '')
        formData.append('oro_workflow_transition[billing_address][street]', '801 Scenic Hwy')
        formData.append('oro_workflow_transition[billing_address][street2]', '')
        formData.append('oro_workflow_transition[billing_address][city]', 'Haines City')
        formData.append('oro_workflow_transition[billing_address][country]', 'US')
        formData.append('oro_workflow_transition[billing_address][region]', 'US-FL')
        formData.append('oro_workflow_transition[billing_address][postalCode]', '33844')
        formData.append('oro_workflow_transition[save_billing_address]', '0')
        formData.append('oro_workflow_transition[billing_address][id]', '')
        formData.append('oro_workflow_transition[billing_address][region_text]', '')
        formData.append('oro_workflow_transition[state_token]', oro_workflow_transition_state_token)

        // eslint-disable-next-line max-len
        response = http.post(BASE_URL +
            '/customer/checkout/' + checkoutId + '?transition=continue_to_shipping_address&_widgetContainer=ajax&_wid=ajax_checkout',
            formData.body(),
            {
                headers: {
                    accept: '*/*',
                    'cache-control': 'no-cache, no-store',
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryU3X95gdqVZCAr4Zf',
                    'x-csrf-header': csrfToken,
                    'x-requested-with': 'XMLHttpRequest',
                },
            }
        )

        check(response, {
            'status code is 200': (response) => response.status === 200,
            'Shipping Information page opened ': (response) => parseHTML(response.body).find('head title').text().indexOf('Shipping Information - Checkout') !== -1
        });

        console.log("Shipping Information step opened with status code: " + formatResult(response));
        TTFB_shipping_information_checkout_page.add(response.timings.waiting, {ttfbURL: response.url});

        oro_workflow_transition_token = getOroWorkflowTransitionToken(response);
        oro_workflow_transition_state_token = getOroWorkflowTransitionStateToken(response);

    });

    /*
    *
    * Go to Shipping Method step page.
    *
    */
    group("shipping method step page", function () {
        formData = new FormData()
        formData.boundary = '----WebKitFormBoundaryuro4cXBBOJWBMzJJ'
        formData.append(
            'oro_workflow_transition[_token]',
            oro_workflow_transition_token
        )
        formData.append('oro_workflow_transition[shipping_address][customerAddress]', '0')
        formData.append('oro_workflow_transition[shipping_address][label]', 'Pr address')
        formData.append('oro_workflow_transition[shipping_address][namePrefix]', '')
        formData.append('oro_workflow_transition[shipping_address][firstName]', 'Amanda')
        formData.append('oro_workflow_transition[shipping_address][middleName]', '')
        formData.append('oro_workflow_transition[shipping_address][lastName]', 'Cole')
        formData.append('oro_workflow_transition[shipping_address][nameSuffix]', '')
        formData.append('oro_workflow_transition[shipping_address][organization]', 'ORO')
        formData.append('oro_workflow_transition[shipping_address][phone]', '')
        formData.append('oro_workflow_transition[shipping_address][street]', '801 Scenic Hwy')
        formData.append('oro_workflow_transition[shipping_address][street2]', '')
        formData.append('oro_workflow_transition[shipping_address][city]', 'Haines City')
        formData.append('oro_workflow_transition[shipping_address][country]', 'US')
        formData.append('oro_workflow_transition[shipping_address][region]', 'US-FL')
        formData.append('oro_workflow_transition[shipping_address][postalCode]', '33844')
        formData.append('oro_workflow_transition[shipping_address][id]', '')
        formData.append('oro_workflow_transition[shipping_address][region_text]', '')
        formData.append('oro_workflow_transition[state_token]', oro_workflow_transition_state_token)

        // eslint-disable-next-line max-len
        response = http.post(BASE_URL +
            '/customer/checkout/' + checkoutId + '?transition=continue_to_shipping_method&_widgetContainer=ajax&_wid=ajax_checkout',
            formData.body(),
            {
                headers: {
                    accept: '*/*',
                    'cache-control': 'no-cache, no-store',
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryuro4cXBBOJWBMzJJ',
                    'x-csrf-header': csrfToken,
                    'x-requested-with': 'XMLHttpRequest',
                },
            }
        )

        check(response, {
            'status code is 200': (response) => response.status === 200,
            'Shipping Method page opened ': (response) => parseHTML(response.body)
                .find('head title')
                .text().indexOf('Shipping Method - Checkout') !== -1
        });

        console.log("Shipping Method step opened with status code:  " + formatResult(response));
        TTFB_continue_to_shipping_method_transition.add(response.timings.waiting, {ttfbURL: response.url});

        oro_workflow_transition_token = getOroWorkflowTransitionToken(response);
        oro_workflow_transition_state_token = getOroWorkflowTransitionStateToken(response);

    });

    /*
    *
    * Go to Payment Method step page.
    *
    */
    group("payment method page step", function () {
        formData = new FormData()
        formData.boundary = '----WebKitFormBoundaryO96h7PEpgswqkxmn'
        formData.append(
            'oro_workflow_transition[_token]',
            oro_workflow_transition_token
        )
        formData.append('oro_workflow_transition[shipping_method]', SHIPPING_METHOD)
        formData.append('oro_workflow_transition[shipping_method_type]', 'primary')
        formData.append('oro_workflow_transition[state_token]', oro_workflow_transition_state_token)

        response = http.post(BASE_URL +
            '/customer/checkout/' + checkoutId + '?transition=continue_to_payment&_widgetContainer=ajax&_wid=ajax_checkout',
            formData.body(),
            {
                headers: {
                    accept: '*/*',
                    'cache-control': 'no-cache, no-store',
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryO96h7PEpgswqkxmn',
                    'x-csrf-header': csrfToken,
                    'x-requested-with': 'XMLHttpRequest',
                },
            }
        )

        check(response, {
            'status code is 200': (response) => response.status === 200,
            'Payment Method page opened ': (response) => parseHTML(response.body)
                .find('head title').text()
                .indexOf('Payment - Checkout') !== -1
        });

        console.log("Payment Method step opened with status code: " + formatResult(response));
        TTFB_continue_to_payment_transition.add(response.timings.waiting, {ttfbURL: response.url});

        oro_workflow_transition_token = getOroWorkflowTransitionToken(response);
        oro_workflow_transition_state_token = getOroWorkflowTransitionStateToken(response);

    });

    /*
    *
    * Go to Order Review step page.
    *
    */
    group("order review step page", function () {
        formData = new FormData()
        formData.boundary = '----WebKitFormBoundaryLCudVZrcIBq5p7wq'
        formData.append(
            'oro_workflow_transition[_token]',
            oro_workflow_transition_token
        )
        //formData.append('oro_workflow_transition[payment_method]', 'payment_term_1')
        formData.append('oro_workflow_transition[payment_method]', PAYMENT_METHOD)
        formData.append('oro_workflow_transition[payment_save_for_later]', '1')
        formData.append('oro_workflow_transition[state_token]', oro_workflow_transition_state_token)
        formData.append('oro_workflow_transition[additional_data]', '')

        response = http.post(BASE_URL +
            '/customer/checkout/' + checkoutId + '?transition=continue_to_order_review&_widgetContainer=ajax&_wid=ajax_checkout',
            formData.body(),
            {
                headers: {
                    accept: '*/*',
                    'cache-control': 'no-cache, no-store',
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryLCudVZrcIBq5p7wq',
                    'x-csrf-header': csrfToken,
                    'x-requested-with': 'XMLHttpRequest',
                },
            }
        )

        check(response, {
            'status code is 200': (response) => response.status === 200,
            'Order review page opened ': (response) => parseHTML(response.body)
                .find('head title')
                .text().indexOf('Order Review - Checkout') !== -1
        });

        console.log("Order Review step opened with status code: " + formatResult(response));
        TTFB_continue_to_order_review_transition.add(response.timings.waiting, {ttfbURL: response.url});

        oro_workflow_transition_token = getOroWorkflowTransitionToken(response);
        oro_workflow_transition_state_token = getOroWorkflowTransitionStateToken(response);

    });

    /*
    *
    * Place order step
    *
    */
    group("go to customer user login page and sign in", function () {
        formData = new FormData()
        formData.boundary = '----WebKitFormBoundaryBpuKsmf0sAGoAmNH'
        formData.append(
            'oro_workflow_transition[_token]',
            oro_workflow_transition_token
        )
        formData.append('oro_workflow_transition[ship_until]', '')
        formData.append('shipping-date-uid-6449638f15fe3', '')
        formData.append('oro_workflow_transition[po_number]', '')
        formData.append('oro_workflow_transition[customer_notes]', '')
        formData.append('oro_workflow_transition[state_token]', oro_workflow_transition_state_token)

        response = http.post(BASE_URL +
            '/customer/checkout/' + checkoutId + '?transition=place_order&_widgetContainer=ajax&_wid=ajax_checkout',
            formData.body(),
            {
                headers: {
                    accept: '*/*',
                    'cache-control': 'no-cache, no-store',
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryBpuKsmf0sAGoAmNH',
                    'x-csrf-header': csrfToken,
                    'x-requested-with': 'XMLHttpRequest',
                },
            }
        )

        check(response, {
            'status code is 200': (response) => response.status === 200,
        });

        console.log("Place_order transition status code: " + formatResultShort(response));
        TTFB_place_order_transition.add(response.timings.waiting, {ttfbURL: response.url});

    });

    /*
    *
    * Go to Thank You step page.
    *
    */
    group(
        'thank you for Your purchase page',
        function () {
            response = http.get(BASE_URL +
                '/customer/checkout/' + checkoutId + '?transition=finish_checkout&_rand=0.26619231848467617',
                {
                    headers: {
                        'upgrade-insecure-requests': '1',
                    },
                }
            )

            check(response, {
                'status code is 200': (response) => response.status === 200,
                'Thank You For Your Purchase page opened ': (response) => parseHTML(response.body)
                    .find('head title')
                    .text().indexOf('Thank You For Your Purchase! - Checkout') !== -1
            });

            console.log("Thank You For Your Purchase page opened with status code: " + formatResult(response));
            TTFB_thank_you_page.add(response.timings.waiting, {ttfbURL: response.url});
        }
    )
}

export function handleSummary(data) {
    console.log('Preparing the end-of-test summary report');
    return {
        'stdout': textSummary(data, {indent: ' ', enableColors: true}),
        'summary.html': htmlReport(data)
    };
}
