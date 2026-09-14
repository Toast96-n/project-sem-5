import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";


// ======================================================
// GEMINI SETUP
// ======================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ======================================================
// FLIPKART SCRAPER
// ======================================================

async function scraptwo(search) {

    console.log("\n========================================");
    console.log("        WISEFIND SCRAPER STARTED");
    console.log("========================================");

    console.log("Search:", search);


    // ==================================================
    // LAUNCH BROWSER
    // ==================================================

    const browser = await chromium.launch({
        headless: true
    });

    console.log("Browser launched");


    try {

        // ==================================================
        // CREATE PAGE
        // ==================================================

        const page = await browser.newPage();

        console.log("New page created");


        // ==================================================
        // OPEN FLIPKART
        // ==================================================

        const url =
            `https://www.flipkart.com/search?q=${encodeURIComponent(search)}`;

        console.log("Opening:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        console.log("Flipkart page loaded");


        // ==================================================
        // WAIT FOR PRODUCT CARDS
        // ==================================================

        await page.waitForSelector("div.lvJbLV", {
            timeout: 30000
        });

        console.log("Product cards loaded");


        // ==================================================
        // SCRAPE PRODUCTS
        // ==================================================

        const products = await page
            .locator("div.lvJbLV")
            .evaluateAll(cards => {

                return cards.map(card => {

                    // ------------------------------------------
                    // ALL TEXT
                    // ------------------------------------------

                    const fullText =
                        card.innerText
                            ?.split("\n")
                            .map(text => text.trim())
                            .filter(Boolean) || [];


                    // ------------------------------------------
                    // LINK
                    // ------------------------------------------

                    const linkElement =
                        card.querySelector('a[href*="/p/"]');

                    const link =
                        linkElement?.href || null;


                    // ------------------------------------------
                    // IMAGE
                    // ------------------------------------------

                    const imageElement =
                        card.querySelector("img");

                    const image =
                        imageElement?.src ||
                        imageElement?.getAttribute("src") ||
                        imageElement?.getAttribute("data-src") ||
                        null;


                    // ------------------------------------------
                    // TITLE
                    // ------------------------------------------

                    let title = null;


                    if (linkElement) {

                        const linkText =
                            linkElement.innerText?.trim();

                        if (linkText) {

                            title =
                                linkText
                                    .replace(/add to compare/gi, "")
                                    .trim();

                        }

                    }


                    // Fallback title
                    if (!title) {

                        const titleElement =
                            card.querySelector("[title]");

                        if (titleElement) {

                            title =
                                titleElement
                                    .getAttribute("title")
                                    ?.replace(/add to compare/gi, "")
                                    .trim() || null;

                        }

                    }


                    // ------------------------------------------
                    // PRICE
                    // ------------------------------------------

                    let price = null;

                    for (const text of fullText) {

                        const priceMatch =
                            text.match(/₹\s?[\d,]+/);

                        if (priceMatch) {

                            price = priceMatch[0];

                            break;

                        }

                    }


                    // ------------------------------------------
                    // RATING
                    // ------------------------------------------

                    let rating = null;


                    // Example:
                    // 4.3 Ratings & 1,234 Reviews

                    for (const text of fullText) {

                        const ratingMatch =
                            text.match(
                                /\b([0-5](?:\.[0-9])?)\s*(?:Ratings?|Stars?)/i
                            );

                        if (ratingMatch) {

                            rating = ratingMatch[1];

                            break;

                        }

                    }


                    // Fallback rating
                    if (!rating) {

                        for (const text of fullText) {

                            const ratingMatch =
                                text.match(
                                    /^([0-5](?:\.[0-9])?)$/
                                );

                            if (ratingMatch) {

                                rating = ratingMatch[1];

                                break;

                            }

                        }

                    }


                    // ------------------------------------------
                    // DISCOUNT
                    // ------------------------------------------

                    let discount = null;


                    for (const text of fullText) {

                        const discountMatch =
                            text.match(
                                /(?:^|\s)(\d+)%\s*off/i
                            );

                        if (discountMatch) {

                            discount =
                                discountMatch[1] + "% off";

                            break;

                        }

                    }


                    // ------------------------------------------
                    // SPECIFICATIONS
                    // ------------------------------------------

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


                    // ------------------------------------------
                    // REMOVE DUPLICATE SPECS
                    // ------------------------------------------

                    const uniqueSpecs =
                        [...new Set(specs)];


                    // ------------------------------------------
                    // RETURN PRODUCT
                    // ------------------------------------------

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


        // ==================================================
        // REMOVE EMPTY PRODUCTS
        // ==================================================

        const validProducts =
            products.filter(product => {

                return (
                    product.title ||
                    product.price ||
                    product.link ||
                    product.image
                );

            });


        // ==================================================
        // REMOVE DUPLICATES
        // ==================================================

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


        console.log(
            "\nProducts found:",
            uniqueProducts.length
        );


        // ==================================================
        // PRINT PRODUCTS
        // ==================================================



        // ==================================================
        // GEMINI
        // ==================================================

        console.log("\n========================================");
        console.log("           GEMINI ANALYSIS");
        console.log("========================================");

        console.log("Sending products to Gemini...");


        // --------------------------------------------------
        // SEND ONLY FIRST 20 TO AI
        // --------------------------------------------------

        const productsForAI =
            uniqueProducts.slice(0, 20);


        // --------------------------------------------------
        // PROMPT
        // --------------------------------------------------

        const prompt = `
You are WiseFind, an AI shopping assistant.

User searched for:

"${search}"

Here are products scraped from Flipkart:

${JSON.stringify(productsForAI, null, 2)}

Analyze these products and recommend the best products.

Consider:

- Price
- Rating
- Specifications
- Discount
- Value for money
- Relevance to the user's search

IMPORTANT:

Do NOT invent any information.

Only use the information provided in the product data.

Give a concise recommendation.

Return your answer in this format:

BEST CHOICE:
Product name

WHY:
Short explanation.

ALTERNATIVE:
Product name

WHY:
Short explanation.

BUDGET OPTION:
Product name

WHY:
Short explanation.

FINAL RECOMMENDATION:
Short conclusion.
`;


        // ==================================================
        // CALL GEMINI
        // ==================================================

        let recommendation = null;


        try {

            const response =
                await ai.models.generateContent({

                    model: "gemini-3.5-flash-lite",

                    contents: prompt,

                    config: {

                        temperature: 0.3,

                        maxOutputTokens: 1000

                    }

                });


            recommendation =
                response.text;


            console.log(
                "\nGemini response received."
            );


        } catch (error) {

            console.error(
                "\nGemini Error:",
                error
            );


            recommendation =
                "AI recommendation is currently unavailable.";

        }


        // ==================================================
        // FINAL JSON
        // ==================================================

        return {

            success: true,

            search: search,

            products: uniqueProducts,

            ai: {

                recommendation: recommendation

            }

        };


    } catch (error) {

        console.error("\nSCRAPER ERROR:");
        console.error(error);


        return {

            success: false,

            search: search,

            products: [],

            ai: {

                recommendation: null

            },

            error: error.message

        };

    } finally {

        // ==================================================
        // CLOSE BROWSER
        // ==================================================

        await browser.close();

        console.log("\nBrowser closed");

    }

}


// ======================================================
// TEST
// ======================================================



    export { scraptwo };