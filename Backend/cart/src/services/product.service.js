const axios = require("axios");

// This service fetches product details from the product microservice.
// It will be mocked in tests.

async function getProductsByIds(ids) {
    try {
        const productPromises = ids.map(id => 
            axios.get(`http://localhost:3001/api/products/${id}`)
                .then(res => res.data)
        );
        const responses = await Promise.all(productPromises);
        return responses.map(response => response.product).filter(Boolean);
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

module.exports = {
    getProductsByIds
};
