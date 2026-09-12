import { chromium } from "playwright";
import "dotenv/config";

async function scrap(search) {

    console.log("\n========================================");
    console.log("        WISEFIND SCRAPER STARTED");
    console.log("========================================");

    console.log("Search:", search);

    // --------------------------------------------------
    // 1. LAUNCH BROWSER
    // --------------------------------------------------

    const browser = await chromium.launch({
        headless: true
    });

    console.log("Browser launched");


    try {

        // --------------------------------------------------
        // 2. CREATE PAGE
        // --------------------------------------------------

        const page = await browser.newPage();

        console.log("New page created");


        // --------------------------------------------------
        // 3. OPEN FLIPKART SEARCH
        // --------------------------------------------------

        const url =
            `https://www.flipkart.com/search?q=${encodeURIComponent(search)}`;

        console.log("Opening:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        console.log("Flipkart page loaded");


        // --------------------------------------------------
        // 4. WAIT FOR PRODUCT CARDS
        // --------------------------------------------------

        await page.waitForSelector("div.lvJbLV", {
            timeout: 30000
        });

        console.log("Product cards loaded");


        // --------------------------------------------------
        // 5. SCRAPE PRODUCTS
        // --------------------------------------------------

        const products = await page.locator("div.lvJbLV").evaluateAll(cards => {

            return cards.map(card => {

                // ==========================================
                // PRODUCT LINK
                // ==========================================

                const linkElement =
                    card.querySelector('a[href*="/p/"]');

                const link =
                    linkElement?.href || null;


                // ==========================================
                // IMAGE
                // ==========================================

                const imageElement =
                    card.querySelector("img");

                const image =
                    imageElement?.src ||
                    imageElement?.getAttribute("src") ||
                    imageElement?.getAttribute("data-src") ||
                    null;


                // ==========================================
                // TITLE
                // ==========================================

                let title = null;

                /*
                    Try the product link first.

                    Usually the main product name is
                    somewhere inside the product link.
                */

                if (linkElement) {

                    const linkText =
                        linkElement.innerText?.trim();

                    if (linkText) {
                        title = linkText;
                    }
                }


                /*
                    If link text is not useful,
                    look for elements containing a title attribute.
                */

                if (!title) {

                    const titleElement =
                        card.querySelector("[title]");

                    if (titleElement) {

                        title =
                            titleElement.getAttribute("title")?.trim() ||
                            null;
                    }
                }


                // ==========================================
                // ALL TEXT
                // ==========================================

                const fullText =
                    card.innerText
                        ?.split("\n")
                        .map(text => text.trim())
                        .filter(Boolean) || [];


                // ==========================================
                // PRICE
                // ==========================================

                let price = null;

                for (const text of fullText) {

                    /*
                        Matches examples:

                        ₹49,999
                        ₹1,299
                        ₹999
                    */

                    const priceMatch =
                        text.match(/₹\s?[\d,]+/);

                    if (priceMatch) {

                        price = priceMatch[0];

                        break;
                    }
                }


                // ==========================================
                // RATING
                // ==========================================

                let rating = null;

                for (const text of fullText) {

                    /*
                        Matches:

                        4.5
                        4.2
                        3.9

                        but avoids things like
                        128 GB / 2025 etc.
                    */

                    const ratingMatch =
                        text.match(/^([0-5](?:\.[0-9])?)$/);

                    if (ratingMatch) {

                        rating = ratingMatch[1];

                        break;
                    }
                }


                // ==========================================
                // DISCOUNT
                // ==========================================

                let discount = null;

                for (const text of fullText) {

                    const discountMatch =
                        text.match(/(\d+)%\s*off/i);

                    if (discountMatch) {

                        discount =
                            discountMatch[1] + "% off";

                        break;
                    }
                }


                // ==========================================
                // SPECIFICATIONS
                // ==========================================

                const specs = [];

                const listItems =
                    card.querySelectorAll("li");

                listItems.forEach(li => {

                    const text =
                        li.innerText?.trim();

                    if (text) {

                        specs.push(text);
                    }
                });


                // ==========================================
                // REMOVE DUPLICATE SPECS
                // ==========================================

                const uniqueSpecs =
                    [...new Set(specs)];


                // ==========================================
                // RETURN PRODUCT
                // ==========================================

                return {

                    title,

                    price,

                    rating,

                    discount,

                    image,

                    link,

                    specs: uniqueSpecs
                };

            });

        });


        // --------------------------------------------------
        // 6. REMOVE EMPTY PRODUCTS
        // --------------------------------------------------

        const validProducts =
            products.filter(product => {

                return (
                    product.title ||
                    product.price ||
                    product.link ||
                    product.image
                );

            });


        // --------------------------------------------------
        // 7. REMOVE DUPLICATES
        // --------------------------------------------------

        const uniqueProducts = [];

        const seenLinks = new Set();

        for (const product of validProducts) {

            if (
                product.link &&
                seenLinks.has(product.link)
            ) {
                continue;
            }

            if (product.link) {
                seenLinks.add(product.link);
            }

            uniqueProducts.push(product);
        }


        // --------------------------------------------------
        // 8. PRINT RESULT
        // --------------------------------------------------

        console.log(
            "\nProducts found:",
            uniqueProducts.length
        );


        console.log("\n========================================");
        console.log("              PRODUCTS");
        console.log("========================================");


        uniqueProducts.forEach((product, index) => {

            console.log(`\nProduct ${index + 1}`);

            console.log(
                "Title:",
                product.title
            );

            console.log(
                "Price:",
                product.price
            );

            console.log(
                "Rating:",
                product.rating
            );

            console.log(
                "Discount:",
                product.discount
            );

            console.log(
                "Image:",
                product.image
            );

            console.log(
                "Link:",
                product.link
            );

            console.log("Specs:");

            product.specs.forEach(spec => {

                console.log(
                    "  -",
                    spec
                );

            });

        });


        console.log("\n========================================");
        console.log("        SCRAPING COMPLETED");
        console.log("========================================");


        // --------------------------------------------------
        // 9. RETURN PRODUCTS
        // --------------------------------------------------

        return uniqueProducts;


    } catch (error) {

        console.error("\nSCRAPER ERROR:");
        console.error(error);

        return [];


    } finally {

        // --------------------------------------------------
        // 10. CLOSE BROWSER
        // --------------------------------------------------

        await browser.close();

        console.log("\nBrowser closed");
    }
}


// ======================================================
// TEST
// ======================================================

scrap("dumbells")

    .then(result => {

        console.log("\nFinal result:");

        console.log(
            JSON.stringify(result, null, 2)
        );

    })

    .catch(error => {

        console.error(error);

    });