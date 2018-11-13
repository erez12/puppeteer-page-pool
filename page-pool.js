const config = require('config');
const puppeteer = require('puppeteer');
const launchOptions = config.get('puppeteer.launch_options');

const fs = require('fs');
const pageCode = fs.readFileSync('./page_code.js', 'utf8');

async function getBrowser() {
    if (getBrowser.__browser) {
        return getBrowser.__browser;
    }

    try {
        let browser = await puppeteer.launch(launchOptions);
        let browserWSEndpoint = browser.wsEndpoint();
        browser.on('disconnected', () => {
            console.error('Browser disconnect');
            getBrowser.__browser = null;
            // TODO - reconnect ? fatal error ?
        });
        getBrowser.__browser = browser;
    } catch (e) {
        getBrowser.__browser = null;
        throw e;
    }

    return getBrowser.__browser;
}
const MAX_PAGES = 6;
let sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) });
class PagePool {
    constructor(options) {
        this.pool = [];
        this.totalPages = 0;
    }
    async getPage(url) {
        let page;
        if (this.pool.length > 0) {
            page = this.pool.shift();
            await page.goto(url, { waitUntil: 'networkidle2' });
            return page;

        } else if (this.totalPages === MAX_PAGES) {
            await sleep(500);
            return this.getPage(url);
        } else {
            this.totalPages++;
            let browser = await getBrowser();
            page = await browser.newPage();

            await page.setViewport({
                width: config.get('puppeteer.viewport_width'),
                height: config.get('puppeteer.viewport_height')
            });
            await page.evaluateOnNewDocument(pageCode);
            await page.goto(url, { waitUntil: 'networkidle2' });
            // TODO - what about errors?
        }

        return page;
    }

    async releasePage(page) {
        this.pool.push(page);
        // TODO - can close pages based on thresh
    }
}

module.exports = new PagePool();