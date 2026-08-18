import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
async function scrap(search){

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    await page.goto(
                `https://www.flipkart.com/search?q=${encodeURIComponent(search)}`,
        {
            waitUntil: "domcontentloaded"
        }   
    );

    const products = page.locator("a").filter({
        has: page.locator("img[alt]")
    }).filter({
        has: page.locator("ul")
    });

    console.log("Products found:", await products.count());

    const productData = [];

    for (let i = 0; i < await products.count(); i++) {

        const product = products.nth(i);

        const name = await product
            .locator("img[alt]")
            .first()
            .getAttribute("alt");

        const image = await product
           .locator("img[alt]")
         .first()
       .getAttribute("src");

        const specs = await product
            .locator("ul li")
            .allTextContents();

        const price = await product
            .locator(".hZ3P6w")
            .first()
            .textContent();

        productData.push({
            name,
            price,  
            specs,
            image
            
        });
    }

//console.log(productData);

    

    const ai = new GoogleGenAI({
       apiKey:process.env.GEMINI_API_KEY
    });

const prompt = `
Compare these products.

Consider:
- Price
- Processor
- RAM
- Storage
- Display
- Camera
- Battery
- Overall value for money

Products:

${JSON.stringify(productData, null, 2)}
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
                        name: { type: "string" },
                        price: { type: "string" },
                        reason: { type: "string" }
                    },
                    required: ["name", "price", "reason"]
                },

                secondBest: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        price: { type: "string" },
                        reason: { type: "string" }
                    },
                    required: ["name", "price", "reason"]
                }
            },

            required: ["bestProduct", "secondBest"]
        }
    }
});

const result = JSON.parse(response.text);


/*console.log("\nBEST PRODUCT");
console.log(result.bestProduct.name);
console.log(result.bestProduct.price);
console.log(result.bestProduct.reason);

console.log("\nSECOND BEST");
console.log(result.secondBest.name);
console.log(result.secondBest.price);
console.log(result.secondBest.reason);
*/
    await browser.close();

    return {
    products: productData,
    comparison: result
};

}

export { scrap };
//npm install express playwright @google/genai
//npx playwright install chromium

