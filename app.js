const express = require("express");
const axios = require("axios");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;

// Environment variables
const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;

// Utility function to filter responses
const filterResponses = (responses, filters) => {
  return responses.filter((response) => {
    return filters.every((filter) => {
      const question = response.questions.find((q) => q.id === filter.id);
      if (!question) return false;

      const value =
        typeof question.value === "string"
          ? question.value.toLowerCase()
          : question.value;
      const filterValue =
        typeof filter.value === "string"
          ? filter.value.toLowerCase()
          : filter.value;

      switch (filter.condition) {
        case "equals":
          return value === filterValue;
        case "does_not_equal":
          return value !== filterValue;
        case "greater_than":
          return value > filterValue;
        case "less_than":
          return value < filterValue;
        default:
          return false;
      }
    });
  });
};

app.get("/:formId/filteredResponses", async (req, res) => {
  try {
    console.log(req.params, req.query);
    const { formId } = req.params;
    const { limit = 150, page = 1, offset = 0, filters } = req.query;

    const allResponses = [];
    try {
      let hasMore = true;
      let currentOffset = 0;

      while (hasMore) {
        const response = await axios.get(`${BASE_URL}/${formId}/submissions`, {
          headers: { Authorization: `Bearer ${API_KEY}` },
          params: { limit: 150, offset: currentOffset },
        });

        allResponses.push(...response.data.responses);
        hasMore = response.data.responses.length === 150;
        currentOffset += 150;
      }
    } catch (error) {
      console.error("Error fetching filtered responses:", error);
      res.status(500).send("Internal Server Error");
    }

    const filtersObj = filters ? JSON.parse(filters) : [];
    const filteredResponses = filterResponses(allResponses, filtersObj);

    const paginatedResponses = filteredResponses.slice(
      offset,
      parseInt(offset) + parseInt(limit)
    );
    res.json({
      responses: paginatedResponses,
      totalResponses: filteredResponses.length,
      pageCount: Math.ceil(filteredResponses.length / limit),
    });
  } catch (error) {
    console.error("Error fetching filtered responses:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
