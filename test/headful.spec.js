/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require('path');
const os = require('os');

const TMP_FOLDER = path.join(os.tmpdir(), 'pptr_tmp_folder-');

module.exports.addTests = function({testRunner, expect, PROJECT_ROOT, defaultBrowserOptions}) {
  const {describe, xdescribe, fdescribe} = testRunner;
  const {it, fit, xit} = testRunner;
  const {beforeAll, beforeEach, afterAll, afterEach} = testRunner;
  const puppeteer = require(PROJECT_ROOT);

  const headfulOptions = Object.assign({}, defaultBrowserOptions, {
    headless: false
  });
  const headlessOptions = Object.assign({}, defaultBrowserOptions, {
    headless: true
  });
  const extensionPath = path.join(__dirname, 'assets', 'simple-extension');
  const extensionOptions = Object.assign({}, defaultBrowserOptions, {
    headless: false,
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  describe('HEADFUL', function() {
    it('background_page target type should be available', async({browser}) => {
      const browserWithExtension = await puppeteer.launch(extensionOptions);
      const page = await browserWithExtension.newPage();
      const targets = await browserWithExtension.targets();
      const backgroundPageTarget = targets.find(target => target.type() === 'background_page');
      await page.close();
      await browserWithExtension.close();
      expect(backgroundPageTarget).toBeTruthy();
    });
    it('should have default url when launching browser', async function() {
      const browser = await puppeteer.launch(extensionOptions);
      const pages = (await browser.pages()).map(page => page.url());
      expect(pages).toEqual(['about:blank']);
      await browser.close();
    });
    xit('headless should be able to read cookies written by headful', async({server}) => {
      const userDataDir = await mkdtempAsync(TMP_FOLDER);
      // Write a cookie in headful chrome
      const headfulBrowser = await puppeteer.launch(Object.assign({userDataDir}, headfulOptions));
      const headfulPage = await headfulBrowser.newPage();
      await headfulPage.goto(server.EMPTY_PAGE);
      await headfulPage.evaluate(() => document.cookie = 'foo=true; expires=Fri, 31 Dec 9999 23:59:59 GMT');
      await headfulBrowser.close();
      // Read the cookie from headless chrome
      const headlessBrowser = await puppeteer.launch(Object.assign({userDataDir}, headlessOptions));
      const headlessPage = await headlessBrowser.newPage();
      await headlessPage.goto(server.EMPTY_PAGE);
      const cookie = await headlessPage.evaluate(() => document.cookie);
      await headlessBrowser.close();
      rm(userDataDir);
      expect(cookie).toBe('foo=true');
    });
  });
};

