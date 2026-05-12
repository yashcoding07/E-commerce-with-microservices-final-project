const { tool } = require("@langchain/core");
const { z } = require("zod");
const axios = require("axios");

const searchProduct = tool(async ({ query, token }) => {
    try {
        const response = await axios.get(`http://localhost:3001/api/products?q=${data.query}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return JSON.stringify(response.data);
    } catch (err) {
        console.log("Error: ", err);
        return "No result found for the query.";
    }
}, {
    name: "Search Product",
    description: "Use this tool when you need to search for products based on a query.",
    Schema: z.object({
        query: z.string().describe("The query to search for.")
    })
});

const addtoCart = tool(async ({ productId, quantity = 1, token }) => {
    const response = await axios.post("http://localhost:3002/api/cart/items", {
        productId,
        quantity
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return `Your product with id ${productId} with quantity ${quantity} has been added to the cart.`;
}, {
    name: "Add to cart",
    description: "Use this tool when you need to add a product to the cart.",
    Schema: z.object({
        productId: z.string().describe("The ID of the product to add to the cart."),
        quantity: z.number().describe("The quantity of the product to add to the cart.").default(1)
    })
});

module.exports = { searchProduct, addtoCart };
