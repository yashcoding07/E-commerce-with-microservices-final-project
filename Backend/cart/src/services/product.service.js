// This service fetches product details from the product microservice.
// It will be mocked in tests.

async function getProductsByIds(ids) {
    // TODO: Replace with actual HTTP call to product service
    // e.g. const response = await axios.post('http://product-service/api/products/batch', { ids });
    // return response.data;
    return [];
}

module.exports = {
    getProductsByIds
};
