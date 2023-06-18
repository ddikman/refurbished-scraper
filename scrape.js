const { chromium } = require('playwright');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const limit = 200;

(async () => {
  // Launch a new browser instance
  const browser = await chromium.launch();

  // Create a new browser context
  const context = await browser.newContext();

  // Create a new page
  const page = await context.newPage();

  // Navigate to the website
  await page.goto('https://www.apple.com/jp/shop/refurbished/mac/macbook-pro');

  const productPages = []

  let listPage = 1;
  while (true) {
    console.log(`Parsing listing page ${listPage++}`)
      // Grab all links
    const linkHrefs = await page.$$eval('.rf-refurb-producttile-link', (links) =>
      links.map((link) => link.href)
    );
    productPages.push(...linkHrefs)

    // Go next page
    const nextButton = await page.$('.rc-pagination .rc-pagination-arrow .icon-chevronright');
    const nextButtonDisabled = await nextButton.getAttribute('aria-disabled')
    if (nextButtonDisabled) {
      break;
    } else {
      await nextButton.click();
    }
  }

  let products = []

  let productPageIndex = 1;
  for (const productPageUrl of productPages) {
    console.log(`Parsing product page ${productPageIndex}/${productPages.length}`)
    await page.goto(productPageUrl)

    const productOverviewInfo = await page.$$eval('.Overview-panel .para-list', (elements) =>
      elements.map((element) => element.innerText)
    )

    const keyboard = await page.$$eval('.TechSpecs-panel .para-list', (elements) =>
      elements.map((e) => e.innerText.trim()).filter((t) => t.includes('キーボード')).join(' ')
    )

    products.push({
      year: productOverviewInfo[0],
      size: productOverviewInfo[1].split('インチ')[0],
      memory: productOverviewInfo[2],
      disk: productOverviewInfo[3],
      keyboard,
      url: productPageUrl
    })

    productPageIndex++;
    if (productPageIndex > limit) {
      console.log(`hit limit of products (${limit}), aborting`)
      break;
    }
  }

  const csvWriter = createCsvWriter({
    path: 'output.csv',
    header: [
      {id: 'year', title: 'Year'},
      {id: 'size', title: 'Size'},
      {id: 'memory', title: 'Memory'},
      {id: 'disk', title: 'Disk'},
      {id: 'keyboard', title: 'Keyboard'},
      {id: 'url', title: 'URL'}
    ]
  });

  await csvWriter.writeRecords(products)

  // Close the browser
  await browser.close();
})();
