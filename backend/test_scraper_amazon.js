import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function scrap(search) {

    const browser = await chromium.launch({
        headless: true
    });

    try {

        const page = await browser.newPage();

        // Block resources that are not needed for scraping
        await page.route("**/*", async route => {

            const type = route.request().resourceType();

            if (
                type === "font" ||
                type === "media" ||
                type === "stylesheet"
            ) {
                await route.abort();
            } else {
                await route.continue();
            }
        });


        // =========================
        // FLIPKART
        // =========================

        await page.goto(
            `https://www.flipkart.com/search?q=${encodeURIComponent(search)}`,
            {
                waitUntil: "domcontentloaded"
            }
        );


        const products = page.locator("a")
            .filter({
                has: page.locator("img[alt]")
            })
            .filter({
                has: page.locator("ul")
            });


        const totalProducts = await products.count();

        const count = Math.min(totalProducts, 20);

        console.log("Products found:", totalProducts);
        console.log("Scraping:", count);


        const productData = [];


        // =========================
        // SCRAPE FIRST 14
        // =========================

        for (let i = 0; i < count; i++) {

            const product = products.nth(i);

            const [name, image, specs, price] = await Promise.all([

                product
                    .locator("img[alt]")
                    .first()
                    .getAttribute("alt"),

                product
                    .locator("img[alt]")
                    .first()
                    .getAttribute("src"),

                product
                    .locator("ul li")
                    .allTextContents(),

                product
                    .locator(".hZ3P6w")
                    .first()
                    .textContent()

            ]);


            if (!name) {
                continue;
            }


            productData.push({
                name: name.trim(),
                price: price?.trim() || "N/A",
                specs: specs.map(s => s.trim()).filter(Boolean),
                image
            });
        }


        console.log(
            "Successfully scraped:",
            productData.length
        );


        // =========================
        // DATA FOR GEMINI
        // =========================

        const aiProducts = productData.map((product, index) => ({

            id: index + 1,

            name: product.name,

            price: product.price,


        }));


        // =========================
        // GEMINI
        // =========================

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });


        const prompt = `
You are a product comparison expert.

Compare the following products and select the best two.

Consider:
- Price
- Processor
- RAM
- Storage
- Display
- Camera
- Battery
- Overall value for money

IMPORTANT:
- Only use information present in the product data.
- Do not invent specifications.
- Prefer products with better specifications for their price.
- Return the product using its exact name from the data.
- The "id" identifies each product.

Products:

${JSON.stringify(aiProducts)}
`;


        const response = await ai.models.generateContent({

            model: "gemini-3.5-flash-lite",

            contents: prompt,

            config: {

                responseMimeType: "application/json",

                responseSchema: {

                    type: "object",

                    properties: {

                        bestProduct: {

                            type: "object",

                            properties: {

                                id: {
                                    type: "number"
                                },

                                name: {
                                    type: "string"
                                },

                                price: {
                                    type: "string"
                                },

                                reason: {
                                    type: "string"
                                }

                            },

                            required: [
                                "id",
                                "name",
                                "price",
                                "reason"
                            ]
                        },


                        secondBest: {

                            type: "object",

                            properties: {

                                id: {
                                    type: "number"
                                },

                                name: {
                                    type: "string"
                                },

                                price: {
                                    type: "string"
                                },

                                reason: {
                                    type: "string"
                                }

                            },

                            required: [
                                "id",
                                "name",
                                "price",
                                "reason"
                            ]
                        }

                    },

                    required: [
                        "bestProduct",
                        "secondBest"
                    ]
                }
            }
        });


        const result = JSON.parse(response.text);


        // =========================
        // RETURN
        // =========================

        return {

            products: productData,

            comparison: result

        };


    } finally {

        await browser.close();

    }
}


export { scrap };